const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const systemPrompt = `És o assistente informativo do website profissional de Inês Bernardo, acupunturista e médica de Medicina Tradicional Chinesa. Responde em português de Portugal, num tom sereno, próximo e conciso. Explica de forma geral o que pode acontecer numa consulta e distingue informação de diagnóstico. Não diagnostiques, não prescrevas, não afirmes resultados clínicos nem peças dados sensíveis. Não inventes morada, preço, horário, contacto, credenciais ou disponibilidade: explica que a pessoa deve contactar Inês diretamente, quando essa informação for publicada. Para sintomas urgentes ou emergência, recomenda o SNS 24 (808 24 24 24) ou o 112 em caso de emergência. Nunca sugiras substituir o acompanhamento médico convencional.`;

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 12_000) {
        reject(new Error('O pedido é demasiado grande.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleChat(request, response) {
  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch {
    if (!response.destroyed) sendJson(response, 400, { error: 'Não foi possível ler a mensagem.' });
    return;
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const history = messages
    .filter((message) => ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
    .slice(-10)
    .map(({ role, content }) => ({ role, content: content.slice(0, 1200) }));

  if (!history.at(-1)?.content.trim()) {
    sendJson(response, 400, { error: 'Escreve uma mensagem para começar.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    const latestMessage = history.at(-1).content.toLocaleLowerCase('pt-PT');
    if (/urg[eê]ncia|emerg[eê]ncia|dor no peito|falta de ar|suic[ií]d|sangramento/.test(latestMessage)) {
      sendJson(response, 200, {
        mode: 'guided',
        reply: 'Esta conversa não permite avaliar uma situação urgente. Liga para o 112 em caso de emergência ou contacta o SNS 24 pelo 808 24 24 24. Não aguardes por uma resposta online para procurar ajuda.',
      });
      return;
    }
    sendJson(response, 200, {
      mode: 'guided',
      reply: 'Obrigada pela tua pergunta. O assistente inteligente ainda não está configurado. Posso dar-te informação geral sobre o que esperar de uma consulta de acupuntura ou Medicina Tradicional Chinesa; para marcações, preços e disponibilidade, consulta os canais oficiais da Inês. O que gostarias de saber?',
    });
    return;
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        max_tokens: 350,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      sendJson(response, 502, { error: 'O assistente está temporariamente indisponível. Tenta novamente daqui a pouco.' });
      return;
    }
    sendJson(response, 200, {
      mode: 'ai',
      reply: data.choices?.[0]?.message?.content || 'Não consegui preparar uma resposta. Experimenta perguntar de outra forma.',
    });
  } catch {
    sendJson(response, 502, { error: 'Não foi possível ligar ao assistente. Tenta novamente daqui a pouco.' });
  }
}

http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/api/chat' && request.method === 'POST') {
    await handleChat(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  let requestedPath;
  try {
    requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}).listen(port, () => {
  console.log(`Inês Bernardo website available at http://localhost:${port}`);
});