namespace Cicclo.Application.Orders.ListOrders;

public sealed record OrderListItemResult(
    Guid Id,
    int ServiceId,
    string ServiceName,
    decimal Price,
    string Status,
    DateTimeOffset CreatedAt);
