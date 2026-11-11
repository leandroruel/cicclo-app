using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cicclo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWalletCreditCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "WalletCredits",
                type: "TEXT",
                nullable: false,
                defaultValue: DateTimeOffset.UtcNow);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "WalletCredits");
        }
    }
}
