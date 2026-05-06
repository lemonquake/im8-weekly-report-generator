from docx import Document
doc = Document("a:/Python/im8-weekly-report/Weekly_Report_2026-04-20.docx")
for para in doc.paragraphs:
    print(para.text)
