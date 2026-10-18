# Inês Bernardo · Website profissional

Website de apresentação, em português de Portugal, para Inês Bernardo, acupunturista e médica de Medicina Tradicional Chinesa. Inclui um assistente virtual integrado no website, com respostas informativas de recurso e integração opcional com a API da OpenAI.

## Executar

Requer Node.js 18 ou mais recente. Não são necessárias dependências.

```sh
npm start
```

Visita [http://localhost:3000](http://localhost:3000). Para escolher outra porta, define `PORT` antes de iniciar o servidor.

## Configurar o assistente de IA

O assistente funciona sem credenciais e apresenta respostas informativas alternativas. Para ativar respostas geradas por IA, define `OPENAI_API_KEY` no ambiente do servidor e, opcionalmente, `OPENAI_MODEL` (por omissão, `gpt-4.1-mini`). A chave nunca é enviada para o navegador. O servidor usa a API compatível com a OpenAI em `/v1/chat/completions`.

Por exemplo, inicia o servidor com as variáveis definidas no ambiente de execução. Nunca publiques uma chave num ficheiro servido ao cliente ou num repositório público. O assistente apresenta-se como virtual, limita o número e o tamanho das mensagens e não é destinado a diagnóstico ou aconselhamento médico.

## Antes de publicar

- Confirma o nome e o título profissional que devem aparecer publicamente.
- Substitui as fotografias de exemplo por fotografias autorizadas da Inês e do consultório.
- Adiciona os contactos, a localização, os horários e os preços oficiais quando forem confirmados.
- Configura a chave da API apenas no servidor e define os avisos de privacidade e tratamento de dados aplicáveis ao serviço escolhido.
- Publica sobre HTTPS e revê as indicações de emergência adequadas ao público e à localização da clínica.