"""Builders for synthetic demo PDFs. Every person, number, and organization here is fictional."""

import pymupdf

ACCOUNT_NUMBER = "987654321012"
EMAIL = "jordan.rivera@example.com"
PHONE = "(512) 555-0147"
MEMBER_ID = "MBR-20931-K"
EMPLOYEE_ID = "NW-4471-Q"
CUSTOMER_NAME = "Jordan A. Rivera"
ADDRESS = "4821 Cedar Hollow Ln, Austin, TX 78745"

HR_EMPLOYEE_ID = "EMP-58213"
HR_SSN = "900-12-3456"
HR_EMAIL = "m.okafor@example.org"
HR_PHONE = "512-555-0199"
HR_PAYROLL_ACCOUNT = "4400123987"
HR_BADGE = "BDG-7731-ATX"

BANNER = "SYNTHETIC DEMO DOCUMENT - FICTIONAL DATA - NOT A REAL ACCOUNT"


def _write_lines(page, lines, x=72, y=72, size=11, leading=18):
    for line in lines:
        if line:
            page.insert_text((x, y), line, fontsize=size, fontname="helv")
        y += leading
    return y


def build_insecure_statement() -> bytes:
    """One-page bank statement whose account number is hidden by a black box but still extractable."""
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)

    page.insert_text((72, 60), BANNER, fontsize=8, fontname="helv", color=(0.6, 0, 0))
    page.insert_text((72, 96), "Northwind Credit Union", fontsize=20, fontname="hebo")
    page.insert_text((72, 118), "Monthly Account Statement - September 2026", fontsize=12, fontname="helv")

    y = _write_lines(page, [
        f"Member: {CUSTOMER_NAME}",
        f"Mailing address: {ADDRESS}",
        f"Email: {EMAIL}",
        f"Phone: {PHONE}",
        f"Member reference: {MEMBER_ID}",
        f"Account Number: {ACCOUNT_NUMBER}",
        "Statement period: 09/01/2026 - 09/30/2026",
    ], y=156)

    # The insecure "redaction": a black rectangle drawn over the account number. The text stays in the PDF.
    hits = page.search_for(ACCOUNT_NUMBER)
    page.draw_rect(hits[0] + (-2, -2, 2, 2), color=(0, 0, 0), fill=(0, 0, 0))

    y += 18
    for date, description, amount in [
        ("Date", "Description", "Amount"),
        ("09/03", "Payroll deposit - Lakeside Analytics", "+2,450.00"),
        ("09/07", "H-E-B Grocery #118", "-86.42"),
        ("09/15", "Autopay transfer to savings", "-312.00"),
        ("09/22", "Austin Energy utility payment", "-104.17"),
    ]:
        font = "hebo" if date == "Date" else "helv"
        page.insert_text((72, y), date, fontsize=10, fontname=font)
        page.insert_text((132, y), description, fontsize=10, fontname=font)
        page.insert_text((470 - pymupdf.get_text_length(amount, font, 10), y), amount, fontsize=10, fontname=font)
        y += 16
    y = _write_lines(page, ["Ending balance: $4,118.36"], y=y + 8, size=10)

    _write_lines(page, [
        "Questions about this statement? Contact your account officer.",
        f"Account officer: Priya Natarajan, staff ID {EMPLOYEE_ID}",
        "Northwind Credit Union, 100 Harbor Way, Portland, OR 97201",
    ], y=y + 24, size=10, leading=16)

    data = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return data


def build_hr_record() -> bytes:
    """Two-page onboarding record with identifiers spread across pages."""
    doc = pymupdf.open()

    page = doc.new_page(width=612, height=792)
    page.insert_text((72, 60), BANNER, fontsize=8, fontname="helv", color=(0.6, 0, 0))
    page.insert_text((72, 96), "Lakeside Analytics - New Hire Record", fontsize=18, fontname="hebo")
    _write_lines(page, [
        "Employee: Maya Okafor",
        f"Employee number: {HR_EMPLOYEE_ID}",
        f"Social Security Number: {HR_SSN}",
        f"Personal email: {HR_EMAIL}",
        f"Mobile: {HR_PHONE}",
        "Date of birth: 03/14/1994",
        "Start date: 10/06/2026",
        "Department: Data Engineering",
    ], y=140)

    page = doc.new_page(width=612, height=792)
    page.insert_text((72, 60), BANNER, fontsize=8, fontname="helv", color=(0.6, 0, 0))
    page.insert_text((72, 96), "Payroll and Access Setup", fontsize=16, fontname="hebo")
    _write_lines(page, [
        f"Direct deposit account number: {HR_PAYROLL_ACCOUNT}",
        f"Building badge: {HR_BADGE}",
        f"Reference employee number {HR_EMPLOYEE_ID} on all payroll questions.",
        "Laptop asset tag: LT-00912",
    ], y=140)

    data = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return data
