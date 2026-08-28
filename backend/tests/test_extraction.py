from io import BytesIO

from docx import Document

from app.extraction import DocumentExtractionError, extract_upload


def make_docx(*paragraphs: str) -> bytes:
    document = Document()
    for paragraph in paragraphs:
        document.add_paragraph(paragraph)
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def upload_for(data: bytes, filename: str = "document.docx"):
    from fastapi import UploadFile

    return UploadFile(filename=filename, file=BytesIO(data))


def test_docx_extracts_paragraph_blocks():
    import asyncio

    result = asyncio.run(
        extract_upload(
            upload_for(make_docx("첫 번째 기준", "두 번째 기준")),
            document_id="doc-1",
            document_type="rubric",
            max_bytes=1024 * 1024,
        )
    )

    assert [block.text for block in result.blocks] == ["첫 번째 기준", "두 번째 기준"]
    assert result.blocks[0].paragraph_number == 1
    assert result.blocks[1].block_id == "doc-1-b2"


def test_unsupported_file_is_rejected():
    import asyncio

    try:
        asyncio.run(
            extract_upload(
                upload_for(b"text", "notes.txt"),
                document_id="doc-1",
                document_type="feedback",
                max_bytes=1024,
            )
        )
    except DocumentExtractionError as exc:
        assert "PDF와 DOCX" in str(exc)
    else:
        raise AssertionError("unsupported files must be rejected")


def test_empty_document_returns_warning():
    import asyncio

    result = asyncio.run(
        extract_upload(
            upload_for(make_docx()),
            document_id="doc-empty",
            document_type="draft",
            max_bytes=1024 * 1024,
        )
    )

    assert result.blocks == []
    assert result.warnings


def test_extraction_redacts_sensitive_text_before_returning_blocks():
    import asyncio

    result = asyncio.run(
        extract_upload(
            upload_for(
                make_docx(
                    "연락처는 010-1234-5678이고 메일은 student@example.com입니다."
                )
            ),
            document_id="doc-private",
            document_type="draft",
            max_bytes=1024 * 1024,
        )
    )

    assert "010-1234-5678" not in result.blocks[0].text
    assert "student@example.com" not in result.blocks[0].text
    assert "[연락처 숨김]" in result.blocks[0].text
    assert "[이메일 숨김]" in result.blocks[0].text
    assert any("자동으로 가렸어요" in warning for warning in result.warnings)
