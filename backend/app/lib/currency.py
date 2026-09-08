from decimal import Decimal


def format_brl(value) -> str:
    """Formata um Decimal/número como 'R$ 1.234,56' (usado em subtítulos de
    busca; a formatação "de verdade" para a UI fica a cargo do frontend)."""
    value = Decimal(value)
    text = f"{value:,.2f}"
    text = text.replace(",", "_").replace(".", ",").replace("_", ".")
    return f"R$ {text}"
