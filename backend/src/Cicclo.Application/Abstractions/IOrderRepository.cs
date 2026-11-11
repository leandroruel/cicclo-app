using Cicclo.Application.Orders.CreateOrder;
using Cicclo.Application.Orders.ListOrders;

namespace Cicclo.Application.Abstractions;

public interface IOrderRepository
{
    Task<CreateOrderResult> CreateAsync(
        int serviceId,
        Guid idempotencyKey,
        CancellationToken cancellationToken);

    Task<CreateOrderResult?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<OrderListItemResult>> GetAllAsync(CancellationToken cancellationToken);
}
