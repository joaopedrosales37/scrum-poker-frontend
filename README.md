# scrum-poker-frontend

## Backend

O frontend usa STOMP sobre SockJS para comunicação em tempo real. Por padrão, ele se conecta ao backend publicado em:

`https://scrum-poker-backend-kgf7.onrender.com`

Para usar outro backend, configure a variável de ambiente antes do build:

```bash
REACT_APP_BACKEND_URL=https://seu-backend.example.com npm run build
```

O backend precisa expor um endpoint SockJS no caminho configurado em `REACT_APP_BACKEND_URL` e aceitar:

- publicação em `/app/poker/{roomId}`;
- assinatura em `/topic/room/{roomId}`;
- mensagens JSON com as ações `JOIN`, `VOTE`, `REVEAL`, `RESET`, `CHANGE_DECK` e `START_TIMER`;
- estado JSON contendo, quando aplicável, `votes`, `avatars`, `isRevealed`, `roomMaster`, `deckType`, `lastAction` e `timerDuration`.

Também é necessário liberar CORS para o domínio onde o frontend está hospedado. No Render, confirme que o serviço aceita conexões WebSocket e que o endpoint SockJS está disponível via HTTPS; a URL raiz só está correta se o backend registrar o SockJS exatamente em `/`.