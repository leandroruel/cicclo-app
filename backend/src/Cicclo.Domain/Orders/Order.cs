namespace Cicclo.Domain.Orders;

public sealed class Order
{
    private Order()
    {
    }

    public Order(
        Guid id,
        Guid walletId,
        int serviceId,
        string serviceNameAtPurchase,
        decimal priceAtPurchase,
        Guid idempotencyKey,
        DateTimeOffset createdAt)
    {
        Id = id;
        WalletId = walletId;
        ServiceId = serviceId;
        ServiceNameAtPurchase = serviceNameAtPurchase;
        PriceAtPurchase = priceAtPurchase;
        Status = OrderStatus.Confirmed;
        IdempotencyKey = idempotencyKey;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public Guid WalletId { get; private set; }

    public int ServiceId { get; private set; }

    public string ServiceNameAtPurchase { get; private set; } = string.Empty;

    public decimal PriceAtPurchase { get; private set; }

    public OrderStatus Status { get; private set; }

    public Guid IdempotencyKey { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
