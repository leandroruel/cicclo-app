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

O débito ainda não é acionado por uma operação HTTP; isso depende do fluxo de pedidos, que permanece fora desta etapa.

Com o SDK .NET 10 instalado, rode os testes de domínio:

```bash
cd backend
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Domain.Tests
```

O teste de integração da wallet roda com:

```bash
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Api.Tests
```

Inicie a API em desenvolvimento a partir de `backend/src/Cicclo.Api` com `dotnet run`. As migrations são aplicadas e a carteira inicial é inserida automaticamente. A referência OpenAPI e a interface Scalar ficam disponíveis no ambiente de desenvolvimento. Serviços, pedidos, integração do app e demais operações ainda não foram implementados.
