import pandas as pd
from titlecase import titlecase
import regex as re
import unicodedata

def is_empty_column(series):
    return series.replace(r'^\s*$', pd.NA, regex=True).isna().all()

def remove_apostrophe(df, col_list):
    apostrophe_pattern = r"['’‘]"   
    for col in col_list:
        if col in df.columns and not is_empty_column(df[col]):
            has_apostrophe = df[col].astype(str).str.contains(apostrophe_pattern, na=False)

            if has_apostrophe.any():
                df.loc[has_apostrophe, col] = (df.loc[has_apostrophe, col].astype(str).str.replace(apostrophe_pattern, "", regex=True))

    return df

def standardize_dates(df, col_list, format_char='/'):
    for col in col_list:
        if col not in df.columns or is_empty_column(df[col]):
            continue
 
        # 1. Parse into authentic Datetimes to validate them
        datetime_column = pd.to_datetime(df[col], errors="coerce")
        bool_col = datetime_column.notna()
        
        # 2. Force the column to be an 'object' type. If we don't do this, Pandas will secretly 
        # auto-convert our new strings right back into datetime objects!
        df[col] = df[col].astype(object)
        
        # 3. Convert to string using the dynamic format character
        df.loc[bool_col, col] = datetime_column.loc[bool_col].dt.strftime(f"%d{format_char}%m{format_char}%y")

    return df

def remove_accents(df, col_list):
    def strip_accents_cell(value):
        if pd.isna(value):
            return value
        
        text_str = str(value)
        normalized = unicodedata.normalize('NFD', text_str)
   
        ascii_clean = "".join(char for char in normalized if unicodedata.category(char) != 'Mn')
        return ascii_clean

    for col in col_list:
        if col in df.columns and not is_empty_column(df[col]):
            df[col] = df[col].map(strip_accents_cell)
            
    return df

def extra_space_remover(df, col_list):
    for col in col_list:
        if col in df.columns and not is_empty_column(df[col]):
            non_null = df[col].notna()
            
            text_series = df.loc[non_null, col].astype(str)
            
            cleaned_series = text_series.str.replace(r'\u200B', '', regex=True) \
                                        .str.replace(r'\xa0', ' ', regex=True) \
                                        .str.strip() \
                                        .str.replace(r'\s+', ' ', regex=True) \
                                        .str.replace(r'\s*-\s*', '-', regex=True) \
                                        .str.replace(r'(\s*,\s*)+', ', ', regex=True) \
                                        .str.replace(r'\.,', ',', regex=True) \
                                        .str.strip()
            
            df.loc[non_null, col] = cleaned_series.where(cleaned_series.str.lower() != 'nan', None)

    return df

def remove_formulas(df, col_list):
    for col in col_list:
        if col in df.columns and not is_empty_column(df[col]):
            text_series = df[col].astype(str).str.strip()      
            is_formula = text_series.str.startswith('=')  
            cleaned_series = text_series.str.lstrip('=')
            
            df[col] = cleaned_series.where(~is_formula, "")
            df[col] = df[col].where(df[col].notna() & (df[col] != 'nan'), None)
            
    return df

def smart_cleaner_controller(df, selected_columns, chosen_options):
    updated_df = df.copy()

    valid_columns = [col for col in selected_columns if col in updated_df.columns]
    if not valid_columns:
        raise ValueError("None of the selected columns exist in the uploaded file.")

    sequence = ["remove_formulas", "standardize_dates", "remove_accents", "extra_space_remover", "remove_apostrophe"]
    for step in sequence:
        if step not in chosen_options:
            continue

        elif step == "remove_apostrophe":
            updated_df = remove_apostrophe(updated_df, valid_columns)

        elif step == "remove_formulas":
            updated_df = remove_formulas(updated_df, valid_columns)

        elif step == "standardize_dates":
            format_char = '-' if "date_style_dashes" in chosen_options else '/'
            updated_df = standardize_dates(updated_df, valid_columns, format_char)

        elif step == "remove_accents":
            updated_df = remove_accents(updated_df, valid_columns)

        elif step == "extra_space_remover":
            updated_df = extra_space_remover(updated_df, valid_columns)
 
    return updated_df