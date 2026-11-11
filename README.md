# CICCLO APP

Aplicação mobile e API para simular uma lavanderia automatizada. O plano funcional e as regras de negócio estão em [PLAN.md](./PLAN.md).

## Estrutura

- `backend/`: API ASP.NET Core e projetos organizados em Clean Architecture.
- `mobile/`: aplicativo React Native com Expo Router e TypeScript.
- `docs/`: documentação da arquitetura e contrato da API.

## Backend

A wallet está implementada no backend: domínio de débito e crédito em `decimal`, versão para concorrência otimista, persistência SQLite versionada por migrations e seed de R$ 50,00. A API expõe `GET /api/v1/wallet` para a carteira padrão, `GET /api/v1/wallet/{id}` para consultar uma carteira pelo ID e `POST /api/v1/wallet/credits`.

### Executar a API com Docker

Com Docker instalado, na raiz do repositório, construa e inicie a API:

```bash
docker build -t cicclo-api ./backend
docker run --name cicclo-api -d -p 8080:8080 -v cicclo-data:/data cicclo-api
```

O SQLite fica no volume `cicclo-data`, preservado ao remover ou recriar o container. Na primeira execução, migrations e dados iniciais são aplicados automaticamente. A API fica disponível em `http://localhost:8080`; confirme com:

```bash
curl http://localhost:8080/api/v1/wallet
```

Para usar de outro dispositivo na mesma rede, configure o app com `http://<IP-do-computador-que-roda-o-Docker>:8080` como `EXPO_PUBLIC_API_URL` e permita a porta 8080 no firewall local. Isso não expõe a API à internet. O CORS atual permite somente a prévia web Expo em `localhost:8081` e `127.0.0.1:8081`; apps nativos não estão sujeitos à política CORS do navegador.

Para interromper e retomar a mesma instância:

```bash
docker stop cicclo-api
docker start cicclo-api
```

Para ver os logs, use `docker logs -f cicclo-api`. Evite remover o volume `cicclo-data` se quiser manter os dados da carteira.

O crédito recebe `{"amount": 50.00}` e exige o cabeçalho `Idempotency-Key`. Repetir a mesma chave e o mesmo valor devolve o resultado original sem creditar novamente; reutilizar a chave com outro valor retorna `409 Conflict`. O saldo e o registro idempotente são salvos na mesma transação.

```bash
curl -X POST http://localhost:5000/api/v1/wallet/credits \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: credit-50-example' \
  -d '{"amount":50.00}'
```

Pedidos podem ser criados em `POST /api/v1/orders` com `{"serviceId": 1}` e `Idempotency-Key` UUID. O débito, o pedido e o lançamento no extrato são gravados atomicamente. Uma repetição válida retorna o pedido original; a API responde com erros de saldo insuficiente, serviço inexistente, chave reutilizada com outro serviço e conflito transitório da carteira conforme o contrato em [PLAN.md](./PLAN.md).

```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7ce7afde-b3c8-4c0f-b59a-f21d9a74f060' \
  -d '{"serviceId":1}'
```

O histórico de pedidos está disponível em `GET /api/v1/orders`, do mais recente para o mais antigo, e um pedido individual pode ser consultado em `GET /api/v1/orders/{id}`. A listagem não é paginada.

```bash
curl http://localhost:5000/api/v1/orders
```

Consulte o extrato da carteira em `GET /api/v1/wallet/transactions`. A resposta contém os lançamentos de débito associados aos pedidos, do mais recente para o mais antigo, com valor, saldo após o lançamento e horário do pedido.

```bash
curl http://localhost:5000/api/v1/wallet/transactions
```

Os serviços Lavagem e Secagem são seedados na base. Consulte os serviços ativos em `GET /api/v1/services` ou busque um serviço ativo por ID em `GET /api/v1/services/{id}`. IDs inexistentes ou inativos retornam `404`:

```bash
curl http://localhost:5000/api/v1/services
curl http://localhost:5000/api/v1/services/1
```

### App mobile

O app Expo apresenta o saldo da carteira e os serviços ativos da API. A solicitação
de serviço exige confirmação, usa uma chave UUID de idempotência e permite repetir
uma tentativa de rede com a mesma chave. O saldo é atualizado após a confirmação.
O app ainda não implementa autenticação, recarga, histórico, localização ou estado
de máquinas.

Configure a URL da API e inicie o app:

```bash
cd mobile
cp .env.example .env
# Ajuste EXPO_PUBLIC_API_URL em .env para um endereço alcançável pelo dispositivo.
npm install
npm run start
```

Use `npm run android`, `npm run ios` ou `npm run web` para iniciar em uma plataforma.
Em um dispositivo físico ou emulador Android, `localhost` pode não apontar para o
computador que está rodando a API; use o endereço da rede local ou o endereço do
host apropriado para o emulador.

Verifique tipos, lint e testes com `npm run typecheck`, `npm run lint` e `npm test`
na pasta `mobile/`.

Com o SDK .NET 10 instalado, rode os testes de domínio:

```bash
cd backend
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Domain.Tests
```

O teste de integração da wallet roda com:

```bash
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Api.Tests
```

O contrato OpenAPI e as decisões de arquitetura estão documentados em [docs/openapi.yaml](./docs/openapi.yaml) e [docs/architecture.md](./docs/architecture.md).

Inicie a API em desenvolvimento a partir de `backend/src/Cicclo.Api` com `dotnet run`. As migrations são aplicadas e os dados iniciais são inseridos automaticamente. A referência OpenAPI gerada e a interface Scalar ficam disponíveis no ambiente de desenvolvimento.
