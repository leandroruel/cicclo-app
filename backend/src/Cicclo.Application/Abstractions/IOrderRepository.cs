using Cicclo.Application.Orders.CreateOrder;

namespace Cicclo.Application.Abstractions;

public interface IOrderRepository
{
    Task<CreateOrderResult> CreateAsync(
        int serviceId,
        Guid idempotencyKey,
        CancellationToken cancellationToken);

    Task<CreateOrderResult?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
