using System.ComponentModel.DataAnnotations;

namespace Cicclo.Api.Contracts;

/// <summary>Valor a adicionar ao saldo da carteira.</summary>
public sealed record CreditWalletRequest
{
    /// <summary>Valor do crédito em reais.</summary>
    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Amount { get; init; }
}
