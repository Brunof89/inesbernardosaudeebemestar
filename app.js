const widget = document.querySelector('[data-assistant-widget]');
const launcher = document.querySelector('.assistant-launcher');
const panel = document.querySelector('.assistant-panel');
const closeButton = document.querySelector('.chat-close');
const messages = document.querySelector('.chat-messages');
const form = document.querySelector('.chat-form');
const input = document.querySelector('#chat-input');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
let conversation = [];
let pending = false;

document.querySelector('#current-year').textContent = String(new Date().getFullYear());

function openAssistant() {
  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => input.focus(), 50);
}

function closeAssistant() {
  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('[data-open-assistant]').forEach((button) => button.addEventListener('click', openAssistant));

launcher.addEventListener('click', () => panel.hidden ? openAssistant() : closeAssistant());
closeButton.addEventListener('click', closeAssistant);

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Abrir navegação' : 'Fechar navegação');
  navigation.classList.toggle('is-open', !isOpen);
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir navegação');
  });
});

function addMessage(role, content) {
  const message = document.createElement('div');
  message.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  const text = document.createElement('span');
  text.textContent = content;
  message.append(text);
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
}

function addSuggestionButtons() {
  const suggestions = document.createElement('div');
  suggestions.className = 'suggestion-list';
  suggestions.innerHTML = '<button type="button" data-suggestion="O que acontece na primeira consulta?">O que acontece numa consulta?</button><button type="button" data-suggestion="O que é a acupuntura?">O que é a acupuntura?</button>';
  messages.append(suggestions);
  messages.scrollTop = messages.scrollHeight;
  bindSuggestions(suggestions);
}

function bindSuggestions(container = messages) {
  container.querySelectorAll('[data-suggestion]').forEach((button) => {
    button.addEventListener('click', () => submitMessage(button.dataset.suggestion));
  });
}

bindSuggestions();

function guidedReply(question) {
  const normalized = question.toLocaleLowerCase('pt-PT');
  if (/urg[eê]ncia|emerg[eê]ncia|dor no peito|falta de ar|suic[ií]d|sangramento/.test(normalized)) {
    return 'Esta conversa não permite avaliar uma situação urgente. Liga para o 112 em caso de emergência ou contacta o SNS 24 pelo 808 24 24 24. Não aguardes por uma resposta online para procurar ajuda.';
  }
  if (/substitu|medica[cç][aã]o|medicamento|parar.*tratamento/.test(normalized)) {
    return 'Não. A acupuntura e a Medicina Tradicional Chinesa não substituem o teu médico, um diagnóstico, medicação prescrita ou outro tratamento convencional. Não alteres a medicação sem conversar com o profissional que te acompanha.';
  }
  if (/primeir|consulta|sess[aã]o|avalia[cç][aã]o/.test(normalized)) {
    return 'A primeira consulta pode começar por uma conversa sobre o teu contexto, o que te traz aqui e o que gostarias de esclarecer. A Inês pode depois conversar contigo sobre uma abordagem adequada ao teu caso. Preços, horários e marcações ainda não estão publicados neste website.';
  }
  if (/agulh|d[oó]i|segur|efeito|risco/.test(normalized)) {
    return 'Perguntas importantes para conversar diretamente com a Inês, que poderá avaliar o teu contexto e explicar-te a abordagem. Se tens receio das agulhas, vale a pena referi-lo antes de qualquer decisão. A adequação e eventuais riscos dependem de cada pessoa; não consigo avaliar isso por chat.';
  }
  if (/acupuntur|medicina chines|medicina tradicional|ventosa|fitoter/.test(normalized)) {
    return 'A acupuntura e a Medicina Tradicional Chinesa são abordagens que podem ser exploradas em consulta, de forma individual. O que faz sentido depende do teu caso e deve ser conversado diretamente com a Inês; este assistente não pode avaliar sintomas nem recomendar tratamentos.';
  }
  if (/marca|contact|pre[cç]o|valor|morada|localiza|hor[aá]rio|onde/.test(normalized)) {
    return 'Os detalhes de marcação, contacto, localização e preços ainda não foram adicionados a este website. Não quero inventar essa informação. Consulta esta página novamente quando os canais oficiais da Inês forem publicados.';
  }
  return 'Posso dar informação geral sobre como funciona uma consulta, acupuntura e Medicina Tradicional Chinesa. Não consigo diagnosticar, avaliar sintomas ou indicar tratamentos. Para perceber se uma abordagem é adequada para ti, conversa diretamente com a Inês e mantém informado o profissional de saúde que te acompanha.';
}

async function submitMessage(content) {
  if (pending || !content.trim()) return;
  const question = content.trim();
  pending = true;
  input.value = '';
  messages.querySelector('.suggestion-list')?.remove();
  addMessage('user', question);
  conversation.push({ role: 'user', content: question });

  const thinking = document.createElement('span');
  thinking.className = 'chat-thinking';
  thinking.textContent = 'A preparar uma resposta...';
  messages.append(thinking);

  let answer;
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation }),
    });
    if (!response.ok) throw new Error('A API não está disponível.');
    const result = await response.json();
    answer = result.reply || guidedReply(question);
  } catch {
    answer = guidedReply(question);
  }

  thinking.remove();
  addMessage('assistant', answer);
  conversation.push({ role: 'assistant', content: answer });
  if (conversation.length > 10) conversation = conversation.slice(-10);
  addSuggestionButtons();
  pending = false;
  input.focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitMessage(input.value);
});

widget.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) closeAssistant();
});

document.addEventListener('click', (event) => {
  if (!panel.hidden && !widget.contains(event.target) && !event.target.closest('[data-open-assistant]')) closeAssistant();
});