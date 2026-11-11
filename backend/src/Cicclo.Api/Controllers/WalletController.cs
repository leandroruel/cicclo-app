using Cicclo.Api.Contracts;
using Cicclo.Application.Wallets.CreditWallet;
using Cicclo.Application.Wallets.GetWallet;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Cicclo.Api.Controllers;

[ApiController]
[Route("api/v1/wallet")]
public sealed class WalletController(
    GetWalletUseCase getWallet,
    CreditWalletUseCase creditWallet) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<WalletResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WalletResponse>> Get(CancellationToken cancellationToken)
    {
        var wallet = await getWallet.ExecuteAsync(cancellationToken);
        if (wallet is null)
        {
            return NotFound();
        }

        return Ok(new WalletResponse(wallet.Id, wallet.Balance, "BRL"));
    }

    [HttpGet("{id:guid}")]
    [EndpointSummary("Busca uma carteira por ID.")]
    [EndpointDescription("Retorna o saldo e a moeda da carteira com o identificador informado.")]
    [ProducesResponseType<WalletResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WalletResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var wallet = await getWallet.ExecuteAsync(id, cancellationToken);
        if (wallet is null)
        {
            return NotFound(new ProblemDetails
            {
                Type = "https://cicclo.app/errors/wallet-not-found",
                Status = StatusCodes.Status404NotFound,
                Title = "Carteira não encontrada",
                Detail = "Nenhuma carteira corresponde ao identificador informado.",
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(new WalletResponse(wallet.Id, wallet.Balance, "BRL"));
    }

    [HttpPost("credits")]
    [ProducesResponseType<WalletResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<WalletResponse>> Credit(
        [FromBody] CreditWalletRequest request,
        [FromHeader(Name = "Idempotency-Key"), Required, StringLength(128, MinimumLength = 1)]
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        var normalizedKey = idempotencyKey?.Trim();
        if (string.IsNullOrEmpty(normalizedKey) || normalizedKey.Length > 128)
        {
            return BadRequest(CreateProblem(
                StatusCodes.Status400BadRequest,
                "idempotency_key_required",
                "O cabeçalho Idempotency-Key é obrigatório."));
        }

        if (request.Amount != decimal.Round(request.Amount, 2))
        {
            return BadRequest(CreateProblem(
                StatusCodes.Status400BadRequest,
                "invalid_credit_amount",
                "O valor do crédito deve ter no máximo duas casas decimais."));
        }

        var result = await creditWallet.ExecuteAsync(
            request.Amount,
            normalizedKey,
            cancellationToken);

        if (result.Status == WalletCreditStatus.IdempotencyKeyConflict)
        {
            return Conflict(CreateProblem(
                StatusCodes.Status409Conflict,
                "idempotency_key_mismatch",
                "A chave de idempotência já foi usada com outro valor."));
        }

        return Ok(new WalletResponse(result.WalletId, result.Balance, "BRL"));
    }

    private ProblemDetails CreateProblem(int status, string code, string detail)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status409Conflict ? "Conflito" : "Requisição inválida",
            Detail = detail,
            Instance = HttpContext.Request.Path
        };
        problem.Extensions["code"] = code;
        return problem;
    }
}
