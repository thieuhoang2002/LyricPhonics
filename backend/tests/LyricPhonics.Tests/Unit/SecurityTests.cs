using System;
using FluentAssertions;
using LyricPhonics.Infrastructure.Security;
using Xunit;

namespace LyricPhonics.Tests.Unit;

public class SecurityTests
{
    [Fact]
    public void PasswordHasher_ShouldHashAndVerify_CorrectPassword()
    {
        // Arrange
        string rawPassword = "P@ssword_Test_123456!";

        // Act
        string hashed = PasswordHasher.HashPassword(rawPassword);
        bool isValid = PasswordHasher.VerifyPassword(rawPassword, hashed);
        bool isInvalid = PasswordHasher.VerifyPassword("WrongPassword", hashed);

        // Assert
        hashed.Should().NotBeNullOrWhiteSpace();
        hashed.Should().Contain(":");
        isValid.Should().BeTrue();
        isInvalid.Should().BeFalse();
    }

    [Fact]
    public void MilitaryWebCrypto_ShouldEncryptAndDecrypt_WithCorrectMasterPassphrase()
    {
        // Arrange
        string secretPayload = "LYRIC_PHONICS_SUPER_ADMIN_VERIFIED";
        string masterPassphrase = "MySecretPassphrase_2026!";
        string hint = "Gợi nhớ ngày kỷ niệm";

        // Act
        var package = MilitaryWebCrypto.Encrypt(secretPayload, masterPassphrase, hint);

        // Assert package structure
        package.Ciphertext.Should().NotBeNullOrWhiteSpace();
        package.Salt.Should().NotBeNullOrWhiteSpace();
        package.Iv.Should().NotBeNullOrWhiteSpace();
        package.Tag.Should().NotBeNullOrWhiteSpace();
        package.Hint.Should().Be(hint);

        // Act decrypt with correct passphrase
        string? decrypted = MilitaryWebCrypto.Decrypt(package, masterPassphrase);
        decrypted.Should().Be(secretPayload);

        // Act decrypt with incorrect passphrase
        string? wrongDecrypted = MilitaryWebCrypto.Decrypt(package, "IncorrectPassphrase");
        wrongDecrypted.Should().BeNull();
    }
}
