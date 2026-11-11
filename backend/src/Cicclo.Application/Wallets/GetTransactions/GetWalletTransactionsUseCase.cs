using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Wallets.GetTransactions;

public sealed class GetWalletTransactionsUseCase(IWalletTransactionRepository transactionRepository)
{
    public Task<IReadOnlyList<WalletTransactionResult>> ExecuteAsync(CancellationToken cancellationToken) =>
        transactionRepository.GetDefaultWalletTransactionsAsync(cancellationToken);
}
