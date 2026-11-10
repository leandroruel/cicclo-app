# CICCLO APP

Aplicação mobile e API para simular uma lavanderia automatizada. O plano funcional e as regras de negócio estão em [PLAN.md](./PLAN.md).

## Estrutura

- `backend/`: API ASP.NET Core e projetos organizados em Clean Architecture.
- `mobile/`: aplicativo React Native com Expo.
- `docs/`: documentação da arquitetura e contrato da API.

## Backend

A wallet está implementada no backend: domínio de débito e crédito em `decimal`, versão para concorrência otimista, persistência SQLite versionada por migrations e seed de R$ 50,00. A API expõe `GET /api/v1/wallet` e `POST /api/v1/wallet/credits`.

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

Os serviços Lavagem e Secagem são seedados na base. Consulte os serviços ativos em `GET /api/v1/services` ou busque um serviço ativo por ID em `GET /api/v1/services/{id}`. IDs inexistentes ou inativos retornam `404`:

```bash
curl http://localhost:5000/api/v1/services
curl http://localhost:5000/api/v1/services/1
```

A integração do app ainda não foi implementada.

Com o SDK .NET 10 instalado, rode os testes de domínio:

```bash
cd backend
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Domain.Tests
```

O teste de integração da wallet roda com:

```bash
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Api.Tests
```

Inicie a API em desenvolvimento a partir de `backend/src/Cicclo.Api` com `dotnet run`. As migrations são aplicadas e os dados iniciais são inseridos automaticamente. A referência OpenAPI e a interface Scalar ficam disponíveis no ambiente de desenvolvimento. A integração mobile ainda não foi implementada.
