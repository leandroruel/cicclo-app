using Cicclo.Api.Contracts;
using Cicclo.Application.Wallets.GetTransactions;
using Microsoft.AspNetCore.Mvc;

namespace Cicclo.Api.Controllers;

[ApiController]
[Route("api/v1/wallet/transactions")]
public sealed class WalletTransactionsController(GetWalletTransactionsUseCase getTransactions) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Lista as transações da carteira.")]
    [EndpointDescription("Retorna os lançamentos do extrato da carteira padrão, do mais recente para o mais antigo.")]
    [ProducesResponseType<WalletTransactionListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<WalletTransactionListResponse>> Get(CancellationToken cancellationToken)
    {
        var transactions = await getTransactions.ExecuteAsync(cancellationToken);
        return Ok(new WalletTransactionListResponse(
            transactions.Select(transaction => new WalletTransactionResponse(
                transaction.Id,
                transaction.Type.ToString(),
                transaction.Amount,
                transaction.BalanceAfter,
                transaction.OrderId,
                transaction.CreatedAt))
                .ToArray()));
    }
}
