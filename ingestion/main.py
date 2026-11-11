import pdfplumber
import pandas as pd
import string
import sys
import datetime
import pathlib
import io

NULL = "NULL"
ACCEPTABLE_NULL_ROWS = [
    # table headers
    ("Syllabus/Component", "Code", "Duration", "Date", "Session"),
    ("Syllabus name", "Code", "Test date window"),
    # label for starting letter of subject name
    *((letter, *((NULL,)*4)) for letter in string.ascii_uppercase),
    # empty rows
    *(("",) * i for i in range(5+1)),
]

# Cambridge uses these formats; see strftime.org
DATE_FORMAT = "%A %d %B %Y"
WINDOW_FORMAT = "%d/%m/%Y"


# effectively an enum but doesn't exactly fit enum.Enum
class RecordFields:
    NAME = "name"
    SYL = "syllabus"
    COMP = "component"
    DATE = "date"
    DATE_TO = "dateto"
    SESSION = "session"

# for some reason, pdfplumber typehints as "PDF"


def extract_from_syllabus_view(pdf: "PDF", page: int) -> list[dict[str, str | datetime.date | None]]:
    records = []
    # page index, so using (page - 1)
    tables = pdf.pages[page - 1].extract_tables()
    for table in tables:
        df = pd.DataFrame(table)
        df = df.fillna(NULL)
        for row in df.itertuples():
            if any(isinstance(cell, str) and not cell.strip() or
                   # accounts for NaN too, since (NaN > 0) == False
                   # however, note that this isn't needed since NaN has been filled with None
                   isinstance(cell, int | float) and not (cell > 0 and cell % 1 == 0) or
                   cell == NULL or cell is None for cell in row):
                assert any(tuple(row)[1:] == acceptable_null_row
                           for acceptable_null_row in ACCEPTABLE_NULL_ROWS), "Unacceptable null row found: " + repr(row)
                # if at this point, it is an acceptable null
                # continue to discard the row
                continue
            # if at this point, it is an exam row
            # _ is for pandas index
            _, name, raw_code, dur, raw_date, session = row
            syl, comp = raw_code.strip().split("/")
            def clean(s): return s.strip().replace("\n", " ")
            date = datetime.datetime.strptime(clean(raw_date), DATE_FORMAT)
            # build and save the record
            record = {
                RecordFields.NAME: clean(name),
                # other side is already stripped by stripping raw_code
                RecordFields.SYL: clean(syl),
                RecordFields.COMP: clean(comp),
                RecordFields.DATE: date,
                RecordFields.DATE_TO: None,
                RecordFields.SESSION: clean(session),
            }
            records.append(record)
    return records


# for some reason, pdfplumber typehints as "PDF"
def extract_from_test_date_windows(pdf: "PDF", page: int) -> list[dict[str, str | datetime.date | None]]:
    records = []
    # page index, so using (page - 1)
    tables = pdf.pages[page - 1].extract_tables()
    for table in tables:
        df = pd.DataFrame(table)
        df = df.fillna(NULL)
        for row in df.itertuples():
            if any(isinstance(cell, str) and not cell.strip() or
                   # accounts for NaN too, since (NaN > 0) == False
                   # however, note that this isn't needed since NaN has been filled with None
                   isinstance(cell, int | float) and not (cell > 0 and cell % 1 == 0) or
                   cell == NULL or cell is None for cell in row):
                assert any(tuple(row)[1:] == acceptable_null
                           for acceptable_null in ACCEPTABLE_NULL_ROWS), "Unacceptable null row found: " + repr(row)
                # if at this point, it is an acceptable null
                # continue to discard the row
                continue
            # if at this point, it is an exam row
            # _ is for pandas index
            _, name, raw_code, raw_window = row
            syl, comp = raw_code.strip().split("/")
            def clean(s): return s.strip().replace("\n", " ")
            raw_date, raw_date_to = raw_window.strip().split("\N{EN DASH}")
            date = datetime.datetime.strptime(clean(raw_date), WINDOW_FORMAT)
            date_to = datetime.datetime.strptime(
                clean(raw_date_to), WINDOW_FORMAT)
            # build and save the record
            record = {
                RecordFields.NAME: clean(name),
                # other side is already stripped by stripping raw_code
                RecordFields.SYL: clean(syl),
                RecordFields.COMP: clean(comp),
                RecordFields.DATE: date,
                RecordFields.DATE_TO: date_to,
                RecordFields.SESSION: None,
            }
            records.append(record)
    return records


def extract_from_pdf(path_or_fp: str | pathlib.Path | io.BufferedReader | io.BytesIO, syllabus_view_pages: list[int], test_date_window_pages: list[int]):
    pdf = pdfplumber.open(path_or_fp)
    records = []
    for page in syllabus_view_pages:
        records.extend(extract_from_syllabus_view(pdf, page))
    for page in test_date_window_pages:
        records.extend(extract_from_test_date_windows(pdf, page))
    return records


if __name__ == "__main__":
    records = extract_from_pdf("dummy/MJ27.pdf", [10, 11, 12, 13], [2])
    df = pd.DataFrame(records)
    df.to_csv("dummy/MJ27.csv", index=False)
    print(df)
