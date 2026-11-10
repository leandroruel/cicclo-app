namespace Cicclo.Api.Contracts;

/// <summary>Pedido confirmado e valores registrados no momento da compra.</summary>
public sealed record OrderResponse(
    Guid Id,
    int ServiceId,
    string ServiceName,
    decimal Price,
    string Currency,
    string Status,
    DateTimeOffset CreatedAt,
    decimal WalletBalance);
