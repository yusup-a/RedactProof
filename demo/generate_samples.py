"""Write the synthetic demo PDFs to demo/samples/. Run from the repo root: .venv/bin/python demo/generate_samples.py"""

from pathlib import Path

import pymupdf

from sample_pdfs import ACCOUNT_NUMBER, build_hr_record, build_insecure_statement

OUT_DIR = Path(__file__).parent / "samples"


def main():
    OUT_DIR.mkdir(exist_ok=True)
    statement = build_insecure_statement()
    (OUT_DIR / "insecure_statement.pdf").write_bytes(statement)
    (OUT_DIR / "hr_record.pdf").write_bytes(build_hr_record())

    # Prove the black box is only cosmetic.
    with pymupdf.open(stream=statement, filetype="pdf") as doc:
        leaked = ACCOUNT_NUMBER in doc[0].get_text()
    print(f"Wrote samples to {OUT_DIR}")
    print(f"Account number hidden under black box still extractable: {leaked}")


if __name__ == "__main__":
    main()
