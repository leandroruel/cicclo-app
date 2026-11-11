using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Orders.ListOrders;

public sealed class ListOrdersUseCase(IOrderRepository orderRepository)
{
    public Task<IReadOnlyList<OrderListItemResult>> ExecuteAsync(CancellationToken cancellationToken) =>
        orderRepository.GetAllAsync(cancellationToken);
}
