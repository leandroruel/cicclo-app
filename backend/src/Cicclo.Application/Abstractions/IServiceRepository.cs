using Cicclo.Domain.Services;

namespace Cicclo.Application.Abstractions;

public interface IServiceRepository
{
    Task<IReadOnlyList<LaundryService>> GetActiveAsync(CancellationToken cancellationToken);

    Task<LaundryService?> GetActiveByIdAsync(int id, CancellationToken cancellationToken);
}
