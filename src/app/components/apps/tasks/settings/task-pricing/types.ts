export type CellState = {
    is_active: boolean;
    original_is_active?: boolean;
    price: string;
    original_price?: string;
};

export type PricingRow = {
    id: string;
    user_id: string;
    user_name?: string;
    original_user_id?: string | null;
    trade_id: string;
    trade_name?: string;
    category_id: string;
    category_name?: string;
    sub_category_id: string;
    sub_category_name?: string;
    task_id: string;
    original_task_id?: string;
    base_active: boolean;
    original_base_active: boolean;
    base_price: string;
    original_base_price: string;
    project_prices: Record<string, CellState>;
};

export type NamedOption = {
    id: string;
    name: string;
};

export type SubCategoryOption = NamedOption & {
    task_id: string;
};

export type UserOption = {
    id: string;
    name: string;
    trade_id?: string | number | null;
    trade_name?: string | null;
    user_code?: string | null;
    first_name?: string;
    last_name?: string;
};
