import pytest

from app.privacy import redact_sensitive_text


@pytest.mark.parametrize(
    ("source", "replacement"),
    [
        ("주민번호 990101-1234567", "[주민등록번호 숨김]"),
        ("연락처 010-1234-5678", "[연락처 숨김]"),
        ("연락처 +82 10 1234 5678", "[연락처 숨김]"),
        ("연구실 02-1234-5678", "[연락처 숨김]"),
        ("메일 student@example.com입니다.", "[이메일 숨김]"),
    ],
)
def test_redacts_supported_sensitive_patterns(source: str, replacement: str):
    result = redact_sensitive_text(source)

    assert result.changed
    assert replacement in result.text
    assert source.split()[-1] not in result.text


def test_preserves_common_assignment_numbers():
    source = "2026년 2학기 보고서는 3,000자이며 참고문헌은 10개 이상입니다."

    result = redact_sensitive_text(source)

    assert result.text == source
    assert not result.changed
