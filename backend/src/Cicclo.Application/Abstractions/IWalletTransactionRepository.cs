using Cicclo.Application.Wallets.GetTransactions;

namespace Cicclo.Application.Abstractions;

public interface IWalletTransactionRepository
{
    Task<IReadOnlyList<WalletTransactionResult>> GetDefaultWalletTransactionsAsync(
        CancellationToken cancellationToken);
}
