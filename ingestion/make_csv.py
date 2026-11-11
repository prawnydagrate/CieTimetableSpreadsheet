import pdfplumber
import pandas as pd
import string
import sys
import datetime
import pathlib
import io
import argparse
import re
import collections
import requests
import json

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

# for finding page numbers from the ToC on the first page
RE_TEST_DATE_WINDOWS = re.compile(
    r"Test\s+date\s+windows\s+(?P<page>\d{2})", re.IGNORECASE)
RE_WEEKLY_VIEW = re.compile(r"Weekly\s+view\s+(?P<page>\d{2})", re.IGNORECASE)
RE_SYLLABUS_VIEW = re.compile(
    r"Syllabus\s+view\s+\(A(\u2013|-)Z\)\s+(?P<page>\d{2})", re.IGNORECASE)
RE_CI_A_LEVEL = re.compile(
    r"Cambridge\s+International\s+A\s+Level\s+(?P<page>\d{2})", re.IGNORECASE)

# in case a URL must be loaded
HEADERS_FILE = "headers.json"


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
                           for acceptable_null in ACCEPTABLE_NULL_ROWS), "unacceptable null row found: " + repr(row)
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


# for some reason, pdfplumber typehints as "PDF"
def extract_from_pdf(pdf: "PDF", syllabus_view_pages: collections.abc.Iterable[int], test_date_window_pages: collections.abc.Iterable[int]) -> list[dict[str, str | datetime.date | None]]:
    records = []
    for page in syllabus_view_pages:
        records.extend(extract_from_syllabus_view(pdf, page))
    for page in test_date_window_pages:
        records.extend(extract_from_test_date_windows(pdf, page))
    return records


def process_pdf(path_or_fp: str | pathlib.Path | io.BufferedReader | io.BytesIO) -> list[dict[str, str | datetime.date | None]]:
    pdf = pdfplumber.open(path_or_fp)
    # need to find page numbers from ToC, then call extract_from_pdf
    coverpage = pdf.pages[0]
    all_text = coverpage.extract_text()
    windows_match = re.search(RE_TEST_DATE_WINDOWS, all_text)
    windows_start = int(windows_match.groupdict()["page"])
    weekly_match = re.search(RE_WEEKLY_VIEW, all_text)
    weekly_start = int(weekly_match.groupdict()["page"])
    syl_view_match = re.search(RE_SYLLABUS_VIEW, all_text)
    syl_view_start = int(syl_view_match.groupdict()["page"])
    # need the last match for A Level, because Test date windows also has it in the ToC
    alvl_match = None
    for m in re.finditer(RE_CI_A_LEVEL, all_text):
        alvl_match = m
    syl_view_end = int(alvl_match.groupdict()["page"])
    syl_view_pages = range(syl_view_start, syl_view_end + 1)
    # start of weekly view is (end of test date windows) + 1
    window_pages = range(windows_start, weekly_start)
    return extract_from_pdf(pdf, list(syl_view_pages), list(window_pages))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "file", help="a valid path to the PDF of the timetable, or a valid URL to it")
    parser.add_argument(
        "output", help="the output file path at which to save the processed CSV file")
    args = parser.parse_args()
    path_or_fp = args.file
    if args.file.startswith("http://") or args.file.startswith("https://"):
        # a URL has been given
        with open(HEADERS_FILE) as f:
            headers = json.load(f)
        print("loading from URL")
        response = requests.get(args.file, headers=headers)
        if not response.ok:
            sys.exit(
                f"error loading from URL {args.file} - got status {response.status_code}")
        print("received file")
        path_or_fp = io.BytesIO(response.content)
    print("processing PDF")
    records = process_pdf(path_or_fp)
    print("finished processing")
    df = pd.DataFrame(records)
    print("saving CSV")
    df.to_csv(args.output, index=False)
    print("saved")


if __name__ == "__main__":
    main()
