# CICCLO APP

Aplicação mobile e API para simular uma lavanderia automatizada. O plano funcional e as regras de negócio estão em [PLAN.md](./PLAN.md).

## Estrutura

- `backend/`: API ASP.NET Core e projetos organizados em Clean Architecture.
- `mobile/`: aplicativo React Native com Expo.
- `docs/`: documentação da arquitetura e contrato da API.

## Backend

A primeira fatia implementada é o domínio da carteira: débito em `decimal`, rejeição de saldo insuficiente sem alterar o saldo e atualização da versão para concorrência otimista.

Com o SDK .NET 10 instalado, rode os testes de domínio:

```bash
cd backend
dotnet test Cicclo.sln --filter FullyQualifiedName~Cicclo.Domain.Tests
```

O backend será desenvolvido em etapas: domínio e testes, persistência SQLite, casos de uso/endpoints e testes de integração. A API e o app ainda não estão conectados.
