using System.Data;
using Cicclo.Application.Abstractions;
using Cicclo.Application.Orders.CreateOrder;
using Cicclo.Domain.Exceptions;
using Cicclo.Domain.Orders;
using Cicclo.Domain.Wallets;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Cicclo.Infrastructure.Persistence.Repositories;

public sealed class OrderRepository(AppDbContext dbContext) : IOrderRepository
{
    public async Task<CreateOrderResult> CreateAsync(
        int serviceId,
        Guid idempotencyKey,
        CancellationToken cancellationToken)
    {
        try
        {
            return await CreateInTransactionAsync(serviceId, idempotencyKey, cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            dbContext.ChangeTracker.Clear();
            return Failure(CreateOrderStatus.WalletConflict);
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode is 5 or 6)
        {
            dbContext.ChangeTracker.Clear();
            return Failure(CreateOrderStatus.WalletConflict);
        }
    }

    private async Task<CreateOrderResult> CreateInTransactionAsync(
        int serviceId,
        Guid idempotencyKey,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var existingOrder = await dbContext.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                order => order.IdempotencyKey == idempotencyKey,
                cancellationToken);

        if (existingOrder is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return await CreateResultAsync(
                existingOrder,
                existingOrder.ServiceId == serviceId
                    ? CreateOrderStatus.Replayed
                    : CreateOrderStatus.IdempotencyKeyMismatch,
                cancellationToken);
        }

        var service = await dbContext.Services
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == serviceId && item.Active,
                cancellationToken);

        if (service is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return Failure(CreateOrderStatus.ServiceNotFound);
        }

        var wallet = await dbContext.Wallets.SingleOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("A carteira padrão não foi encontrada.");

        try
        {
            wallet.Debit(service.Price);
        }
        catch (InsufficientBalanceException exception)
        {
            await transaction.CommitAsync(cancellationToken);
            return new CreateOrderResult(
                CreateOrderStatus.InsufficientBalance,
                null,
                service.Id,
                service.Name,
                null,
                null,
                null,
                exception.Balance,
                exception.Required);
        }

        var order = new Order(
            Guid.NewGuid(),
            wallet.Id,
            service.Id,
            service.Name,
            service.Price,
            idempotencyKey,
            DateTimeOffset.UtcNow);
        var ledgerEntry = new WalletTransaction(
            Guid.NewGuid(),
            wallet.Id,
            WalletTransactionType.Debit,
            service.Price,
            wallet.Balance,
            order.Id);

        dbContext.Orders.Add(order);
        dbContext.WalletTransactions.Add(ledgerEntry);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateResult(order, ledgerEntry.BalanceAfter, CreateOrderStatus.Created);
    }

    public async Task<CreateOrderResult?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return null;
        }

        return await CreateResultAsync(order, CreateOrderStatus.Created, cancellationToken);
    }

    private async Task<CreateOrderResult> CreateResultAsync(
        Order order,
        CreateOrderStatus status,
        CancellationToken cancellationToken)
    {
        var ledgerEntry = await dbContext.WalletTransactions
            .AsNoTracking()
            .SingleAsync(entry => entry.OrderId == order.Id, cancellationToken);

        return CreateResult(order, ledgerEntry.BalanceAfter, status);
    }

    private static CreateOrderResult CreateResult(
        Order order,
        decimal walletBalance,
        CreateOrderStatus status) =>
        new(
            status,
            order.Id,
            order.ServiceId,
            order.ServiceNameAtPurchase,
            order.PriceAtPurchase,
            order.Status.ToString(),
            order.CreatedAt,
            walletBalance,
            null);

    private static CreateOrderResult Failure(CreateOrderStatus status) =>
        new(status, null, null, null, null, null, null, null, null);
}
