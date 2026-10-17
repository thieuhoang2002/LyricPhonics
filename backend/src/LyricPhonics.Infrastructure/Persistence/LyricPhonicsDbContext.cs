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
    }
}
