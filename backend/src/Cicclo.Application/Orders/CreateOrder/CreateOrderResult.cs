namespace Cicclo.Application.Orders.CreateOrder;

public enum CreateOrderStatus
{
    Created,
    Replayed,
    ServiceNotFound,
    InsufficientBalance,
    IdempotencyKeyMismatch,
    WalletConflict
}

public sealed record CreateOrderResult(
    CreateOrderStatus Status,
    Guid? Id,
    int? ServiceId,
    string? ServiceName,
    decimal? Price,
    string? OrderStatus,
    DateTimeOffset? CreatedAt,
    decimal? WalletBalance,
    decimal? Required);
