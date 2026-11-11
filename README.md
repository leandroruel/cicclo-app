# CICCLO APP

Aplicação mobile e API para simular uma lavanderia automatizada. O plano funcional e as regras de negócio estão em [PLAN.md](./PLAN.md).

## Estrutura

- `backend/`: API ASP.NET Core e projetos organizados em Clean Architecture.
- `mobile/`: aplicativo React Native com Expo Router e TypeScript.
- `docs/`: documentação da arquitetura e contrato da API.

## Backend

A wallet está implementada no backend: domínio de débito e crédito em `decimal`, versão para concorrência otimista, persistência SQLite versionada por migrations e seed de R$ 50,00. A API expõe `GET /api/v1/wallet` para a carteira padrão, `GET /api/v1/wallet/{id}` para consultar uma carteira pelo ID e `POST /api/v1/wallet/credits`.

### Executar a API com Docker

Instale e inicie o Docker Desktop (Windows/macOS) ou o Docker Engine (Linux). Não é necessário instalar o .NET SDK para executar a API pelo container. Todos os comandos abaixo são executados na raiz do repositório.

Na primeira execução, construa a imagem e crie/inicie o container:

```bash
docker build -t cicclo-api ./backend
docker run --name cicclo-api -d -p 8080:8080 -v cicclo-data:/data cicclo-api
```

O container aplica as migrations e insere os dados iniciais automaticamente. A API fica disponível em `http://localhost:8080`. Verifique se está respondendo:

```bash
curl http://localhost:8080/api/v1/wallet
```

O banco SQLite fica no volume Docker `cicclo-data`, que sobrevive a reinicializações e à recriação do container. Não remova esse volume se quiser manter o saldo, pedidos e transações.

Comandos para verificar, acompanhar os logs, parar e retomar o container:

```bash
docker ps
docker logs -f cicclo-api
docker stop cicclo-api
docker start cicclo-api
```

Para incorporar alterações no código da API, reconstrua a imagem e recrie o container mantendo o volume de dados:

```bash
docker build -t cicclo-api ./backend
docker rm -f cicclo-api
docker run --name cicclo-api -d -p 8080:8080 -v cicclo-data:/data cicclo-api
```

O nome `cicclo-api` e a porta `8080` não podem estar ocupados por outro container ou serviço. Se o container já existir, use `docker start cicclo-api` em vez de executar novamente o comando inicial `docker run`.

#### Usar o app mobile com a API Docker

Configure `EXPO_PUBLIC_API_URL` no arquivo `mobile/.env` antes de iniciar ou reiniciar o Expo:

- Navegador no mesmo computador: `http://localhost:8080`
- Emulador Android padrão: `http://10.0.2.2:8080`
- Dispositivo físico na mesma rede: `http://<IP-do-computador-que-roda-o-Docker>:8080`

Por exemplo, em `mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.25:8080
```

Substitua o IP de exemplo pelo endereço local do computador. Permita conexões de entrada na porta `8080` no firewall do computador. Isso permite acesso somente na rede local; não publica a API na internet. A prévia web da API permite CORS para `localhost:8081` e `127.0.0.1:8081`; clientes nativos não aplicam a política CORS do navegador.

O crédito recebe `{"amount": 50.00}` e exige o cabeçalho `Idempotency-Key`. Repetir a mesma chave e o mesmo valor devolve o resultado original sem creditar novamente; reutilizar a chave com outro valor retorna `409 Conflict`. O saldo e o registro idempotente são salvos na mesma transação.

```bash
curl -X POST http://localhost:8080/api/v1/wallet/credits \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: credit-50-example' \
  -d '{"amount":50.00}'
```

Pedidos podem ser criados em `POST /api/v1/orders` com `{"serviceId": 1}` e `Idempotency-Key` UUID. O débito, o pedido e o lançamento no extrato são gravados atomicamente. Uma repetição válida retorna o pedido original; a API responde com erros de saldo insuficiente, serviço inexistente, chave reutilizada com outro serviço e conflito transitório da carteira conforme o contrato em [PLAN.md](./PLAN.md).

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7ce7afde-b3c8-4c0f-b59a-f21d9a74f060' \
  -d '{"serviceId":1}'
```

O histórico de pedidos está disponível em `GET /api/v1/orders`, do mais recente para o mais antigo, e um pedido individual pode ser consultado em `GET /api/v1/orders/{id}`. A listagem não é paginada.

```bash
curl http://localhost:8080/api/v1/orders
```

Consulte o extrato da carteira em `GET /api/v1/wallet/transactions`. A resposta contém os lançamentos de débito associados aos pedidos, do mais recente para o mais antigo, com valor, saldo após o lançamento e horário do pedido.

```bash
curl http://localhost:8080/api/v1/wallet/transactions
```

Os serviços Lavagem e Secagem são seedados na base. Consulte os serviços ativos em `GET /api/v1/services` ou busque um serviço ativo por ID em `GET /api/v1/services/{id}`. IDs inexistentes ou inativos retornam `404`:

```bash
curl http://localhost:8080/api/v1/services
curl http://localhost:8080/api/v1/services/1
```

### App mobile

O app Expo apresenta o saldo da carteira e os serviços ativos da API, permite adicionar créditos simulados e consultar o histórico de transações. A recarga não processa pagamentos reais. A solicitação de serviço exige confirmação, usa uma chave UUID de idempotência e permite repetir uma tentativa de rede com a mesma chave; o saldo e o histórico são atualizados após a confirmação. O app ainda não implementa autenticação, localização ou estado de máquinas.

Configure a URL da API e inicie o app:

```bash
cd mobile
cp .env.example .env
# Ajuste EXPO_PUBLIC_API_URL em .env para o endereço da API acessível pelo dispositivo.
npm install
npm run start
```

Se a API estiver rodando no Docker local, consulte a seção [Usar o app mobile com a API Docker](#usar-o-app-mobile-com-a-api-docker) para escolher o endereço correto. Reinicie o Expo após alterar `.env`.

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
