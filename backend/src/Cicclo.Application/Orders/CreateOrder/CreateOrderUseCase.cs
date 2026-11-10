using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Orders.CreateOrder;

public sealed class CreateOrderUseCase(IOrderRepository orderRepository)
{
    public Task<CreateOrderResult> ExecuteAsync(
        int serviceId,
        Guid idempotencyKey,
        CancellationToken cancellationToken) =>
        orderRepository.CreateAsync(serviceId, idempotencyKey, cancellationToken);

    public Task<CreateOrderResult?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        orderRepository.GetByIdAsync(id, cancellationToken);
}
