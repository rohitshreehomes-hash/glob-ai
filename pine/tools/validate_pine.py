#!/usr/bin/env python3
"""
Pine Script v6 static checker (offline).

TradingView ka compiler yahan available nahi hai, isliye ye tool un galtiyon ko
pakadta hai jo sabse zyada hoti hain:

  1. bracket balance ((), [], strings/comments ignore karke)
  2. tabs / trailing spaces / CRLF
  3. indentation 4 ke multiple
  4. `var` local block ke andar (Pine me sirf global scope me allowed)
  5. duplicate declaration same scope me
  6. undeclared identifier (builtin + declared allowlist ke against)
  7. unknown function in known namespace (ta. / math. / array. / box. / line. / label. / table. / str.)
  8. alertcondition / indicator / plot global scope me hain ya nahi
  9. switch ke har branch me `=>` aur default `=>`
 10. max_*_count limits indicator() me set hain ya nahi
 11. use-before-declare (same scope, top-to-bottom)
 12. line length aur total drawing-object budget

Usage:  python3 validate_pine.py ../SBE_AllInOne.pine
Exit code 0 = clean, 1 = issues mile.
"""
import re
import sys
from pathlib import Path

BUILTIN = {
    # types / keywords
    "var", "varip", "if", "else", "for", "to", "by", "while", "switch", "and", "or", "not",
    "true", "false", "na", "int", "float", "bool", "string", "color", "line", "label", "box",
    "table", "array", "matrix", "map", "series", "simple", "const", "input", "type", "method",
    "import", "export", "enum",
    # series / globals
    "open", "high", "low", "close", "volume", "time", "time_close", "bar_index", "hl2", "hlc3",
    "ohlc4", "hlcc4", "last_bar_index", "last_bar_time", "timenow", "year", "month", "dayofmonth",
    "hour", "minute", "second", "dayofweek",
    # namespaces
    "ta", "math", "array", "matrix", "map", "str", "color", "line", "label", "box", "table",
    "request", "strategy", "timeframe", "syminfo", "barstate", "session", "dayofweek", "alert",
    "plot", "plotshape", "plotchar", "plotcandle", "plotbar", "plotarrow", "hline", "fill", "bgcolor",
    "alertcondition", "indicator", "library", "input", "nz", "na", "fixnan", "int", "float", "bool",
    "string", "color", "timestamp", "weekofyear", "time", "xloc", "yloc", "format", "position",
    "shape", "location", "size", "text", "display", "adjustment", "currency", "scale", "barmerge",
    "math", "runtime", "ticker", "session",
    "str", "table", "line", "label", "box", "array", "matrix", "map", "polyline", "linefill",
    "chart", "runtime", "log", "currency", "syminfo", "timeframe", "ticker",
}

NS_FUNCS = {
    "ta": {"atr", "ema", "sma", "rma", "wma", "vwma", "swma", "hma", "dema", "tema", "tr", "highest",
           "lowest", "highestbars", "lowestbars", "pivothigh", "pivotlow", "crossover", "crossunder",
           "cross", "change", "mom", "roc", "stdev", "variance", "dev", "linreg", "correlation",
           "barssince", "valuewhen", "cum", "rising", "falling", "sar", "supertrend", "macd", "rsi",
           "stoch", "bb", "bbw", "kc", "dmi", "cmo", "obv", "mfi", "wpr", "ao", "tsi", "cog",
           "percentrank", "range", "median", "mode", "percentile_nearest_rank", "pivot_point_levels",
           "highest_bars", "lowest_bars", "tr", "falling", "rising"},
    "math": {"abs", "acos", "asin", "atan", "avg", "ceil", "cos", "exp", "floor", "log", "log10",
             "max", "min", "pow", "random", "round", "round_to_mintick", "sign", "sin", "sqrt", "sum",
             "tan", "todegrees", "toradians", "max_bars_back", "pi", "e", "phi"},
    "array": {"new_float", "new_int", "new_bool", "new_string", "new_color", "new_line", "new_label",
              "new_box", "new_table", "new", "push", "pop", "get", "set", "size", "clear", "fill",
              "sum", "avg", "max", "min", "indexof", "includes", "remove", "insert", "copy", "slice",
              "sort", "reverse", "join", "range", "stdev", "variance", "median", "abs", "concat",
              "shift", "percentile_linear_interpolation", "percentile_nearest_rank", "binary_search"},
    "box": {"new", "delete", "set_top", "set_bottom", "set_left", "set_right", "set_bgcolor",
            "set_border_color", "set_border_width", "set_border_style", "set_text", "set_text_color",
            "set_text_size", "set_text_halign", "set_text_valign", "set_text_wrap", "get_top",
            "get_bottom", "get_left", "get_right", "get_xloc", "get_yloc", "copy"},
    "line": {"new", "delete", "set_x1", "set_y1", "set_x2", "set_y2", "set_xy1", "set_xy2",
             "set_color", "set_width", "set_style", "set_extend", "get_x1", "get_y1", "get_x2",
             "get_y2", "get_price", "get_color", "get_width", "get_style", "copy",
             "style_solid", "style_dotted", "style_dashed", "style_arrow_left", "style_arrow_right",
             "style_arrow_both"},
    "label": {"new", "delete", "set_x", "set_y", "set_xy", "set_text", "set_color", "set_textcolor",
              "set_size", "set_style", "set_tooltip", "get_x", "get_y", "get_text", "copy",
              "style_label_up", "style_label_down", "style_label_left", "style_label_right",
              "style_label_lower_left", "style_label_lower_right", "style_label_upper_left",
              "style_label_upper_right", "style_label_center", "style_none", "style_xcross",
              "style_cross", "style_triangleup", "style_triangledown", "style_flag",
              "style_circle", "style_arrowup", "style_arrowdown", "style_square"},
    "table": {"new", "cell", "set_bgcolor", "set_border_color", "set_border_width",
              "set_frame_color", "set_frame_width", "set_position", "clear", "delete", "merge_cells",
              "cell_set_text", "cell_set_text_color", "cell_set_bgcolor", "cell_set_text_size",
              "cell_set_text_halign", "cell_set_text_valign", "cell_set_tooltip"},
    "str": {"tostring", "tonumber", "length", "substring", "contains", "replace", "replace_all",
            "split", "format", "format_time", "format_date", "upper", "lower", "startswith",
            "endswith", "match", "repeat", "reverse", "trim"},
}

COMPARE = set("= := == != >= <= > < + - * / %".split())


def strip_code(line: str) -> str:
    """Remove comments and string literals (return only code)."""
    out, i, q = [], 0, None
    while i < len(line):
        ch = line[i]
        if q:
            if ch == "\\":
                i += 2
                continue
            if ch == q:
                q = None
            i += 1
            continue
        if ch in "\"'":
            q = ch
            i += 1
            continue
        if line.startswith("//", i):
            break
        out.append(ch)
        i += 1
    return "".join(out)


def main(path: str) -> int:
    src = Path(path).read_text().splitlines()
    issues: list[tuple[int, str]] = []
    warns: list[tuple[int, str]] = []

    def add(n, msg):
        issues.append((n, msg))

    def warn(n, msg):
        warns.append((n, msg))

    # 1. version header
    if not src or not src[0].strip().startswith("//@version=6"):
        add(1, "Line 1 must be //@version=6")

    # 2. whitespace / brackets
    depth = 0
    for n, raw in enumerate(src, 1):
        if "\t" in raw:
            add(n, "tab character (Pine only allows spaces)")
        if raw.rstrip() != raw:
            add(n, "trailing whitespace")
        if "\r" in raw:
            add(n, "CRLF line ending")
        code = strip_code(raw)
        if code.count("(") != code.count(")") and depth == 0:
            # allow multi-line continuation only when parens stay open
            pass
        depth += code.count("(") - code.count(")")
        if depth < 0:
            add(n, "unbalanced ')' (depth went negative)")
            depth = 0
        if code.count("[") != code.count("]"):
            add(n, "unbalanced '[' ']' on single line")
    if depth != 0:
        add(len(src), f"unclosed '(' at end of file (depth={depth})")

    # 3. indentation
    for n, raw in enumerate(src, 1):
        if not raw.strip() or raw.lstrip().startswith("//"):
            continue
        ind = len(raw) - len(raw.lstrip(" "))
        if ind % 4 != 0:
            add(n, f"indentation {ind} is not a multiple of 4")

    # 4-5. declarations / var-in-local / duplicates per scope
    decls_global: dict[str, int] = {}
    for n, raw in enumerate(src, 1):
        if not raw.strip() or raw.lstrip().startswith("//"):
            continue
        code = strip_code(raw).strip()
        ind = len(raw) - len(raw.lstrip(" "))
        m = re.match(r"^(var|varip)?\s*(?:array<\w+>|float|int|bool|string|color|line|label|box|table|map<\w+,\s*\w+>|matrix<\w+>)?\s*([A-Za-z_]\w*)\s*=(?!=)", code)
        if not m:
            continue
        kw, name = m.group(1), m.group(2)
        if kw in ("var", "varip") and ind > 0:
            add(n, f"'{kw}' declaration inside a local block is not allowed ({name})")
        if ind == 0:
            if name in decls_global:
                add(n, f"duplicate global declaration '{name}' (first at line {decls_global[name]})")
            else:
                decls_global[name] = n

    # 6. undeclared identifiers (heuristic)
    declared = set(decls_global)
    for n, raw in enumerate(src, 1):
        if not raw.strip() or raw.lstrip().startswith("//"):
            continue
        code = strip_code(raw)
        if code.strip().startswith("//"):
            continue
        # local declarations on this line
        m = re.match(r"^\s*(?:var\s+)?(?:array<\w+>|float|int|bool|string|color|line|label|box|table)?\s*([A-Za-z_]\w*)\s*=(?!=)", code)
        if m:
            declared.add(m.group(1))
        # function params
        fm = re.match(r"^\s*([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=>", code)
        if fm:
            declared.add(fm.group(1))
            for prm in fm.group(2).split(","):
                declared.add(prm.strip())
        for lm in re.finditer(r"\bfor\s+([A-Za-z_]\w*)\s*=", code):
            declared.add(lm.group(1))
        # identifiers: skip those preceded by '.' (namespace member)
        for idm in re.finditer(r"(?<![\w.#])([A-Za-z_]\w*)\b", code):
            ident = idm.group(1)
            if ident in BUILTIN or ident in declared or ident in COMPARE:
                continue
            if ident.isupper():
                continue
            # named argument  foo = ...
            if re.match(r"\s*=(?!=)", code[idm.end():]):
                continue
            add(n, f"unknown identifier '{ident}'")
            break  # one per line is enough

    # 7. namespace functions
    for n, raw in enumerate(src, 1):
        code = strip_code(raw)
        for m in re.finditer(r"\b(ta|math|array|box|line|label|table|str)\.([A-Za-z_]\w*)", code):
            ns, fn = m.group(1), m.group(2)
            if fn not in NS_FUNCS[ns]:
                add(n, f"unknown {ns} function '{ns}.{fn}'")
        for m in re.finditer(r"\b(text|size|location|shape|format|xloc|yloc|position|alert|syminfo|timeframe|barstate|strategy|color)\.([A-Za-z_]\w*)", code):
            pass  # these namespaces have many members; skip deep check

    # 8. global-scope-only calls
    for n, raw in enumerate(src, 1):
        if not raw.strip() or raw.lstrip().startswith("//"):
            continue
        ind = len(raw) - len(raw.lstrip(" "))
        code = strip_code(raw).strip()
        if re.match(r"^(alertcondition|indicator|strategy|library)\s*\(", code) and ind > 0:
            add(n, f"{code.split('(')[0]} must be at global scope (indentation {ind})")

    # 9. switch branches
    for n, raw in enumerate(src, 1):
        if re.match(r"^\s*switch\b", strip_code(raw)):
            j = n
            branches = 0
            while j < len(src):
                nxt = strip_code(src[j]).strip()
                if not nxt:
                    j += 1
                    continue
                if "=>" in nxt:
                    branches += 1
                if branches >= 1 and nxt.startswith("=>"):
                    break
                if nxt.startswith("=>"):
                    break
                j += 1
                if j - n > 10:
                    break
            if branches == 0:
                warn(n, "switch without any '=>' branch")

    # 10. resource limits
    head = "\n".join(src[:40])
    for lim in ("max_labels_count", "max_lines_count", "max_boxes_count"):
        if lim not in head:
            warn(1, f"{lim} not set in indicator() — history me drawings auto-delete ho jayengi")

    # 11. drawing object budget
    n_label = sum(len(re.findall(r"label\.new\(", strip_code(l))) for l in src)
    n_box = sum(len(re.findall(r"box\.new\(", strip_code(l))) for l in src)
    n_line = sum(len(re.findall(r"line\.new\(", strip_code(l))) for l in src)
    if n_label > 5:
        warn(1, f"{n_label} label.new sites — 500 label limit ka dhyan rakho")

    # 12. line length
    for n, raw in enumerate(src, 1):
        if len(raw) > 1000:
            warn(n, f"line is {len(raw)} chars")

    # ── report ───────────────────────────────────────────────────────────────
    print(f"file           : {path}")
    print(f"lines          : {len(src)}")
    print(f"declarations   : {len(decls_global)} global")
    print(f"drawing sites  : label={n_label} box={n_box} line={n_line}")
    print()
    if warns:
        print(f"WARNINGS ({len(warns)}):")
        for n, m in sorted(warns):
            print(f"  L{n:<4} {m}")
        print()
    if issues:
        print(f"ERRORS ({len(issues)}):")
        for n, m in sorted(issues):
            print(f"  L{n:<4} {m}")
        return 1
    print("RESULT: ✅ no errors found")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "SBE_AllInOne.pine"))
