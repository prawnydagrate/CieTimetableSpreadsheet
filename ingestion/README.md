# Usage

`make_csv` generates CSV files from CIE examination timetables.

```bash
usage: make_csv [-h] file output

positional arguments:
  file        a valid path to the PDF of the timetable, or a valid URL to it
  output      the output file path at which to save the processed CSV file; curly braces may be used to
              dynamically insert the month, year, and administrative zone (where Zone 3 (UK) is written
              as Zone 0) e.g. '{month}_{year}_Zone{zone}.csv' may become 'March_2027_Zone4.csv' and
              '{m}{yy}.csv' may become 'J28.csv'

options:
  -h, --help  show this help message and exit
```
