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
                defaultValueSql: "(strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'))");
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
