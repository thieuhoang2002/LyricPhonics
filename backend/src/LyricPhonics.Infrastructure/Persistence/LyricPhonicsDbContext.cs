using Microsoft.EntityFrameworkCore;
using LyricPhonics.Domain.Entities;

namespace LyricPhonics.Infrastructure.Persistence;

/// <summary>
/// DbContext Entity Framework Core cho LyricPhonics, kết nối tới Neon Serverless PostgreSQL.
/// </summary>
public class LyricPhonicsDbContext : DbContext
{
    public LyricPhonicsDbContext(DbContextOptions<LyricPhonicsDbContext> options) : base(options)
    {
    }

    public DbSet<TrackEntity> Tracks => Set<TrackEntity>();
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<PricingTierEntity> PricingTiers => Set<PricingTierEntity>();
    public DbSet<ApiKeyEntity> ApiKeys => Set<ApiKeyEntity>();
    public DbSet<AdminSecurityEntity> AdminSecurities => Set<AdminSecurityEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TrackEntity>(entity =>
        {
            entity.ToTable("tracks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Artist).HasMaxLength(255);
            entity.Property(e => e.FileName).HasMaxLength(500);
            entity.Property(e => e.DetectedLanguage).HasMaxLength(50);
            entity.Property(e => e.LinesJson).HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.RegistrationIp).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<PricingTierEntity>(entity =>
        {
            entity.ToTable("pricing_tiers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PriceUsd).HasPrecision(10, 2);
        });

        modelBuilder.Entity<ApiKeyEntity>(entity =>
        {
            entity.ToTable("api_keys");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Provider).HasMaxLength(50).IsRequired();
            entity.Property(e => e.KeyValue).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("Healthy");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<AdminSecurityEntity>(entity =>
        {
            entity.ToTable("admin_securities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Ciphertext).IsRequired();
            entity.Property(e => e.Salt).IsRequired();
            entity.Property(e => e.Iv).IsRequired();
            entity.Property(e => e.Tag).IsRequired();
            entity.Property(e => e.Hint).HasMaxLength(500);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });
    }
}
