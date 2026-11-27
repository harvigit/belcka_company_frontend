import dayjs from 'dayjs';

export type VehicleType = 'company' | 'management' | 'private';
export type FuelType = 'diesel' | 'petrol' | 'electric' | 'hybrid';
export type VehicleStatus = 'active' | 'inactive' | 'in_service' | 'archived';
export type DueState = 'ok' | 'soon' | 'overdue' | 'missing';

export interface Vehicle {
    id: number;
    registration: string;
    make_model: string;
    type: VehicleType;
    fuel_type: FuelType;
    mileage: number;
    status: VehicleStatus;
    driver_id: number | null;
    driver_name: string | null;
    driver_image?: string | null;
    mot_due: string;
    insurance_due: string;
    tax_due: string;
    // computed from last service + fleet rule, not user-entered
    service_due: string;
    // computed from last tyre check/change + fleet rule
    tyre_check_due?: string;
    // company vehicles: photo check requested on a random date in the period
    next_photo_check?: string;
    gps_tracker: string;
    notes: string;
    created_at: string;
    archived_at?: string | null;
    vin?: string;
    first_registered?: string;
    v5c_reference?: string;
    registered_keeper?: string;
    engine?: string;
    parking?: ParkingPlace | null;
    // litres per week, 0 = unlimited
    weekly_fuel_limit?: number;
    // normal L/100 km; outside it the vehicle is flagged
    fuel_use_min?: number | null;
    fuel_use_max?: number | null;
}

export interface ParkingPlace {
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
}

// Defaults; useVehicles copies saved Settings values in here
export const DEFAULT_FLEET_RULES = {
    serviceMonths: 12,
    serviceMiles: 12000,
    tyreCheckMonths: 6,
    tyreCheckMiles: 10000,
    treadLimitMm: 3,
    photoCheckMonths: 3,
    // a date this many days away or closer shows as "Due soon"
    dueSoonDays: 30,
    mileageRatePence: 45,
    odometerEveryFill: true,
    motValidMonths: 12,
};

export type FleetRules = typeof DEFAULT_FLEET_RULES;

export const FLEET_RULES: FleetRules = {...DEFAULT_FLEET_RULES};

export interface DriverLicence {
    driver_id: number;
    driver_name: string;
    categories: string;
    checked_on: string;
    valid_until: string;
    checked_by: string;
    // DVLA check code or other ref; licence image is not stored
    reference: string;
}

export type LicenceState = 'valid' | 'soon' | 'expired' | 'missing';

export const LICENCE_STATE: Record<
    LicenceState,
    {
        label: string;
        color: 'success' | 'warning' | 'error' | 'default';
    }
> = {
    valid: {label: 'Valid', color: 'success'},
    soon: {label: 'Expires soon', color: 'warning'},
    expired: {label: 'Expired', color: 'error'},
    missing: {label: 'Not recorded', color: 'default'},
};

export const licenceState = (l?: DriverLicence | null): LicenceState => {
    if (!l?.valid_until) return 'missing';
    const s = dueState(l.valid_until);
    return s === 'overdue' ? 'expired' : s === 'soon' ? 'soon' : 'valid';
};

export interface Reimbursement {
    driver_id: number;
    method: 'per_mile' | 'fixed';
    rate_pence: number;
    fixed_amount: number;
}

export type EventKind =
    | 'service'
    | 'mot'
    | 'tyre_check'
    | 'tyre_change'
    | 'fuel'
    | 'mileage'
    | 'repair'
    | 'accident'
    // invoice-only costs (Invoices tab)
    | 'insurance'
    | 'road_tax'
    | 'parking'
    | 'road_charge'
    | 'fine'
    | 'other_cost'
    // sent by the driver from the app
    | 'cleaning'
    | 'vehicle_supplies'
    | 'mileage_claim'
    // seven whole-vehicle photos from the driver app
    | 'photo_check';

export interface VehicleEvent {
    id: number;
    vehicle_id: number;
    kind: EventKind;
    date: string;
    mileage: number | null;
    cost: number | null;
    supplier: string;
    invoice_no: string;
    note: string;
    litres?: number | null;
    // tread per wheel in mm
    tread?: Partial<Record<TyreWheel, number>>;
    wheels?: Partial<Record<TyreWheel, {state: TyreState; photo?: string}>>;
    extra_photo?: string;
    // tyre change: lowest tread after the change
    lowest_tread?: number | null;
    // MOT result
    passed?: boolean;
    file_name?: string;
    file_url?: string;
    // accident photos
    photos?: string[];
    // app expenses/claims await approval; web records have no status
    status?: ExpenseStatus;
    submitted_by?: string;
    submitted_by_image?: string | null;
    project?: string;
    // mileage claims: business miles and pence per mile
    claim_miles?: number;
    claim_rate?: number;
    decided_by?: string;
    decided_by_image?: string | null;
    decided_at?: string;
    reject_reason?: string;
    // set on imported rows so the import can be undone
    import_id?: string;
    // fuel card used (last 6 digits)
    card?: string;
    // Google-picked station; empty when typed by hand
    station?: StationPlace | null;
    from_api?: boolean;
    created_by: string;
    created_by_image?: string | null;
    created_at: string;
}

export interface StationPlace {
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id: string;
}

// a card belongs to a person; fuel goes to the vehicle they drive that day
export interface FuelCard {
    id: number;
    number: string; // last 6 digits only
    holder: string;
    driver_id: number | null;
    driver_name: string | null;
    driver_image?: string | null;
    group: string;
    expires: string; // YYYY-MM
    blocked: boolean;
}

export const CARD_GROUPS = ['Drivers', 'Managers', 'Pool'] as const;

export const cardState = (c: FuelCard): {label: string; color: 'success' | 'warning' | 'error' | 'default'} => {
    if (c.blocked) return {label: 'Blocked', color: 'default'};
    const end = dayjs(`${c.expires}-01`).endOf('month').format('YYYY-MM-DD');
    const s = dueState(end);
    return s === 'overdue'
        ? {label: 'Expired', color: 'error'}
        : s === 'soon'
          ? {label: 'Expires soon', color: 'warning'}
          : {label: 'Active', color: 'success'};
};

export type ConnectionKind = 'file' | 'live' | 'server';

export interface Connection {
    id: string;
    name: string;
    brings: string;
    kind: ConnectionKind;
    target: 'fuel' | 'charges' | 'none';
    charge_kind?: EventKind;
    connected: boolean;
    account: string;
    connected_by: string;
    connected_by_image?: string | null;
    connected_at: string;
}

export const CONNECTION_KIND: Record<ConnectionKind, string> = {
    file: 'File import',
    live: 'Live data',
    server: 'Needs a server',
};

export interface ImportBatch {
    id: string; // "fuel-1", "charge-2"
    connection_id: string;
    source: string;
    file_name: string;
    period_from: string;
    period_to: string;
    rows: number;
    litres: number;
    total: number;
    imported_by: string;
    imported_by_image?: string | null;
    imported_at: string;
    undone_by?: string;
    undone_at?: string;
    // saved via the API; others still live in this browser
    from_api?: boolean;
}

// Not in the planned tables yet; the app saves a point per driver record
export interface DriverLocation {
    id: number;
    driver_id: number;
    driver_name: string;
    driver_image?: string | null;
    vehicle_id: number | null;
    at: string; // ISO date and time
    lat: number;
    lng: number;
    place: string;
    kind: LocationKind;
    // shown under the kind, e.g. "Defect found", "Parking"
    action: string;
    // daily check with a defect: the marker turns red
    alert?: boolean;
    checklist_id?: number;
    defect_id?: number;
}

export type PlaceKind =
    'office' | 'depot' | 'site' | 'fuel' | 'garage' | 'parking' | 'hospital' | 'photo' | 'accident' | 'other';

export const PLACE_KIND: Record<PlaceKind, {label: string; color: string; hint: string}> = {
    office: {label: 'Office', color: '#1e4db7', hint: 'Head office or a branch'},
    depot: {label: 'Depot / yard', color: '#455a64', hint: 'Where vehicles are kept'},
    site: {label: 'Site', color: '#f57c00', hint: 'A work site or project'},
    fuel: {label: 'Fuel station', color: '#ef6c00', hint: 'Where drivers fill up'},
    garage: {label: 'Garage', color: '#6d4c41', hint: 'Service, MOT or repairs'},
    parking: {label: 'Parking', color: '#0277bd', hint: 'Car park or permit zone'},
    hospital: {label: 'Hospital', color: '#d32f2f', hint: 'Nearest A&E for sites'},
    photo: {label: 'Photo check point', color: '#00838f', hint: 'Where photo checks are done'},
    accident: {label: 'Accident spot', color: '#c62828', hint: 'Where an accident happened'},
    other: {label: 'Other', color: '#7c4dff', hint: 'Anything else'},
};

export interface FleetPlace {
    id: number;
    name: string;
    kind: PlaceKind;
    address: string;
    lat: number;
    lng: number;
    note: string;
    created_by: string;
    created_by_image?: string | null;
    created_at: string;
}

export type LocationKind =
    'daily_check' | 'fuel' | 'mileage' | 'tyre_check' | 'photo_check' | 'accident' | 'expense' | 'mileage_claim';

export const LOCATION_KIND: Record<LocationKind, {label: string; color: string}> = {
    daily_check: {label: 'Daily check', color: '#2e7d32'},
    fuel: {label: 'Fuel', color: '#ef6c00'},
    mileage: {label: 'Mileage', color: '#1565c0'},
    tyre_check: {label: 'Tyre check', color: '#6a1b9a'},
    photo_check: {label: 'Photo check', color: '#00838f'},
    accident: {label: 'Accident', color: '#c62828'},
    expense: {label: 'Expense', color: '#5d4037'},
    mileage_claim: {label: 'Mileage claim', color: '#3949ab'},
};

export type ActivityArea =
    | 'vehicle'
    | 'driver'
    | 'record'
    | 'document'
    | 'permit'
    | 'onboarding'
    | 'defect'
    | 'expense'
    | 'card'
    | 'import'
    | 'settings'
    | 'place';

export const ACTIVITY_AREA: Record<ActivityArea, string> = {
    vehicle: 'Vehicles',
    driver: 'Drivers and licences',
    record: 'MOT, service, fuel and costs',
    document: 'Documents',
    permit: 'Parking permits',
    onboarding: 'Start lists',
    defect: 'Defects and accidents',
    expense: 'Expense approvals',
    card: 'Fuel cards',
    import: 'Imports and conflicts',
    settings: 'Settings and connections',
    place: 'Map places',
};

export interface Activity {
    id: number;
    at: string; // ISO date and time
    by: string;
    by_image?: string | null;
    area: ActivityArea;
    vehicle_id: number | null;
    action: string;
    detail: string;
}

export type ConflictType = 'unknown_registration' | 'card_not_linked' | 'over_fuel_limit' | 'duplicate';

export const CONFLICT_TYPE: Record<ConflictType, string> = {
    unknown_registration: 'Registration not in the fleet',
    card_not_linked: 'Card not linked to a person',
    over_fuel_limit: 'Weekly fuel limit exceeded',
    duplicate: 'Already imported',
};

export interface ImportConflict {
    id: number;
    import_id: string | null;
    source: string;
    type: ConflictType;
    detail: string;
    vehicle_id: number | null;
    date: string;
    amount: number | null;
    resolved: boolean;
    note: string;
    resolved_by: string;
    resolved_by_image?: string | null;
    resolved_at: string;
    // saved via the API; others still live in this browser
    from_api?: boolean;
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export const EXPENSE_STATUS: Record<ExpenseStatus, {label: string; color: 'warning' | 'success' | 'error'}> = {
    pending: {label: 'Waiting for approval', color: 'warning'},
    approved: {label: 'Approved', color: 'success'},
    rejected: {label: 'Rejected', color: 'error'},
};

// Only approved costs count towards a vehicle's totals.
export const countsAsCost = (e: VehicleEvent) => (e.cost ?? 0) > 0 && (!e.status || e.status === 'approved');

/* ---------- Fuel use ---------- */
const LITRES_PER_GALLON = 4.54609;
const KM_PER_MILE = 1.609344;
export const l100ToMpg = (l100: number) => (100 * LITRES_PER_GALLON) / (l100 * KM_PER_MILE);

export interface FuelUse {
    fills: number;
    litres: number;
    cost: number;
    // fill to fill: miles between fills and the litres put in at the later fill
    measured_miles: number;
    measured_litres: number;
    measured_cost: number;
    l100: number | null;
    mpg: number | null;
}

// Measured fill to fill (odometer fills only); pending/rejected excluded
export function fuelUse(events: VehicleEvent[], from = ''): FuelUse {
    const fills = events.filter((e) => e.kind === 'fuel' && (!e.status || e.status === 'approved'));
    const inPeriod = fills.filter((e) => e.date >= from);
    const withOdo = fills.filter((e) => e.mileage && e.litres).sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0));
    let miles = 0;
    let litres = 0;
    let cost = 0;
    for (let i = 1; i < withOdo.length; i++) {
        if (withOdo[i].date < from) continue;
        miles += (withOdo[i].mileage ?? 0) - (withOdo[i - 1].mileage ?? 0);
        litres += withOdo[i].litres ?? 0;
        cost += withOdo[i].cost ?? 0;
    }
    const l100 = miles > 0 && litres > 0 ? (litres / (miles * KM_PER_MILE)) * 100 : null;
    return {
        fills: inPeriod.length,
        litres: inPeriod.reduce((s, e) => s + (e.litres ?? 0), 0),
        cost: inPeriod.reduce((s, e) => s + (e.cost ?? 0), 0),
        measured_miles: miles,
        measured_litres: litres,
        measured_cost: cost,
        l100,
        mpg: l100 ? l100ToMpg(l100) : null,
    };
}

export type FuelRangeState = 'not_set' | 'unknown' | 'within' | 'above' | 'below';
export const FUEL_RANGE_STATE: Record<
    FuelRangeState,
    {
        label: string;
        color: 'success' | 'error' | 'warning' | 'default';
    }
> = {
    not_set: {label: 'Not set', color: 'default'},
    unknown: {label: 'Not enough fills', color: 'default'},
    within: {label: 'Within the normal range', color: 'success'},
    above: {label: 'Above the normal range', color: 'error'},
    below: {label: 'Below the normal range', color: 'warning'},
};

export const fuelRangeState = (vehicle: Vehicle, l100: number | null): FuelRangeState => {
    const min = vehicle.fuel_use_min || 0;
    const max = vehicle.fuel_use_max || 0;
    if (!min && !max) return 'not_set';
    if (l100 === null) return 'unknown';
    if (max && l100 > max) return 'above';
    if (min && l100 < min) return 'below';
    return 'within';
};

export const fuelRangeText = (vehicle: Vehicle) => {
    const min = vehicle.fuel_use_min || 0;
    const max = vehicle.fuel_use_max || 0;
    if (!min && !max) return 'Not set';
    if (min && max) return `${min} – ${max} L/100 km`;
    return min ? `At least ${min} L/100 km` : `Up to ${max} L/100 km`;
};

// look-back window for the Action Centre fuel use check
export const FUEL_CHECK_DAYS = 30;

export type DefectSeverity = 'minor' | 'major' | 'critical';
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface DailyCheckItem {
    id: number;
    title: string;
    all_drivers: boolean;
    drivers: {id: number; name: string; image?: string | null}[];
}

export const dailyChecksFor = (driverId: number, items: DailyCheckItem[]) =>
    items.filter((c) => c.all_drivers || c.drivers.some((d) => d.id === driverId));

// Company vehicles with a driver need one if any item applies to them
export const needsDailyCheck = (v: Vehicle, items: DailyCheckItem[]) =>
    v.status === 'active' && !!v.driver_id && v.type !== 'private' && dailyChecksFor(v.driver_id, items).length > 0;

export const SEVERITY: Record<DefectSeverity, {label: string; color: 'default' | 'warning' | 'error'}> = {
    minor: {label: 'Minor', color: 'default'},
    major: {label: 'Major', color: 'warning'},
    critical: {label: 'Critical', color: 'error'},
};

export const DEFECT_STATUS: Record<
    DefectStatus,
    {
        label: string;
        color: 'error' | 'warning' | 'success' | 'default';
    }
> = {
    open: {label: 'Open', color: 'error'},
    in_progress: {label: 'In progress', color: 'warning'},
    resolved: {label: 'Resolved', color: 'success'},
    closed: {label: 'Closed', color: 'default'},
};

export interface Defect {
    id: number;
    vehicle_id: number;
    type: 'defect' | 'accident';
    category: string;
    severity: DefectSeverity;
    incident_date?: string;
    photos?: string[];
    // defect: the driver's note; accident: "What happened?"
    description: string;
    reported_by: string;
    reported_by_image?: string | null;
    reported_at: string;
    // defects only; accidents have no checklist
    checklist_id?: number | null;
    status: DefectStatus;
    owner: string;
    resolution: string;
    updated_by: string;
    updated_by_image?: string | null;
    updated_at: string;
}

export interface DailyChecklist {
    id: number;
    vehicle_id: number;
    driver_name: string;
    driver_image?: string | null;
    date: string;
    submitted_at?: string;
    mileage: number;
    // defect items have a note and at least one photo
    items: {item: string; ok: boolean; note: string; photos: string[]}[];
}

export const defectItem = (d: Defect, checklists: DailyChecklist[]) =>
    checklists.find((c) => c.id === d.checklist_id)?.items.find((i) => i.item === d.category);

export const checklistSafe = (c: DailyChecklist) => c.items.every((i) => i.ok);

export const EVENT_KINDS: Record<
    EventKind,
    {
        label: string;
        color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
    }
> = {
    service: {label: 'Service', color: 'primary'},
    mot: {label: 'MOT', color: 'success'},
    tyre_check: {label: 'Tyre check', color: 'info'},
    tyre_change: {label: 'Tyre change', color: 'info'},
    fuel: {label: 'Fuel', color: 'warning'},
    mileage: {label: 'Mileage reading', color: 'secondary'},
    repair: {label: 'Repair', color: 'primary'},
    accident: {label: 'Accident', color: 'error'},
    insurance: {label: 'Insurance', color: 'secondary'},
    road_tax: {label: 'Road tax', color: 'secondary'},
    parking: {label: 'Parking', color: 'secondary'},
    road_charge: {label: 'Road charge', color: 'secondary'},
    fine: {label: 'Fine', color: 'error'},
    other_cost: {label: 'Other cost', color: 'secondary'},
    cleaning: {label: 'Cleaning', color: 'secondary'},
    vehicle_supplies: {label: 'Vehicle supplies', color: 'secondary'},
    mileage_claim: {label: 'Mileage claim', color: 'info'},
    photo_check: {label: 'Photo check', color: 'info'},
};

/* ---------- Photo checks ---------- */
export const PHOTO_SHOTS = ['Front', 'Back', 'Left side', 'Right side', 'Interior front', 'Interior rear', 'Odometer'];

// Fuel, MOT, service and tyres have own tabs (they move mileage/due dates)
export const INVOICE_KINDS: EventKind[] = [
    'repair',
    'insurance',
    'road_tax',
    'parking',
    'road_charge',
    'fine',
    'other_cost',
];

export type PermitStatus = 'pending' | 'approved' | 'rejected';

export interface ParkingPermit {
    id: number;
    vehicle_id: number;
    zone: string;
    issuer: string;
    reference: string;
    valid_from: string;
    valid_until: string;
    status: PermitStatus;
    requested_by: string;
    requested_by_image?: string | null;
    decided_by: string;
    decided_by_image?: string | null;
    decided_at: string;
    reject_reason: string;
}

export type PermitState = 'pending' | 'rejected' | 'active' | 'expiring' | 'expired' | 'upcoming';

export const PERMIT_STATE: Record<
    PermitState,
    {
        label: string;
        color: 'success' | 'warning' | 'error' | 'default' | 'info';
    }
> = {
    pending: {label: 'Waiting for approval', color: 'warning'},
    rejected: {label: 'Rejected', color: 'error'},
    active: {label: 'Active', color: 'success'},
    expiring: {label: 'Expires soon', color: 'warning'},
    expired: {label: 'Expired', color: 'default'},
    upcoming: {label: 'Starts later', color: 'info'},
};

export const permitState = (p: ParkingPermit): PermitState => {
    if (p.status === 'pending') return 'pending';
    if (p.status === 'rejected') return 'rejected';
    const today = dayjs().format('YYYY-MM-DD');
    if (p.valid_from > today) return 'upcoming';
    if (p.valid_until < today) return 'expired';
    return dueState(p.valid_until) === 'soon' ? 'expiring' : 'active';
};

export interface OnboardingTemplate {
    id: number;
    name: string;
    steps: {id: number; title: string}[];
}

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
    {
        id: 1,
        name: 'Driver',
        steps: [
            {id: 1, title: 'Driving licence checked'},
            {id: 2, title: 'Fuel card issued to the person'},
            {id: 3, title: 'Added to the RingGo parking account'},
            {id: 4, title: 'Vehicle added to TfL Auto Pay (Congestion Charge, ULEZ)'},
            {id: 5, title: 'Handover photo check done'},
            {id: 6, title: 'Rules read and accepted'},
        ],
    },
    {
        id: 2,
        name: 'Manager',
        steps: [
            {id: 11, title: 'Driving licence checked'},
            {id: 12, title: 'Fuel card issued to the person'},
            {id: 13, title: 'Added to the RingGo parking account'},
            {id: 14, title: 'Vehicle added to TfL Auto Pay (Congestion Charge, ULEZ)'},
            {id: 15, title: 'Private use agreement signed'},
            {id: 16, title: 'Handover photo check done'},
        ],
    },
];

// Management cars start the Manager list; other company vehicles the Driver list.
export const defaultTemplateFor = (type: VehicleType): OnboardingTemplate | undefined =>
    ONBOARDING_TEMPLATES.find((t) => t.name.toLowerCase() === (type === 'management' ? 'manager' : 'driver')) ??
    ONBOARDING_TEMPLATES[0];

export interface VehicleOnboarding {
    id: number;
    vehicle_id: number;
    driver_id: number;
    driver_name: string;
    driver_image?: string | null;
    template_id: number;
    template_name: string;
    started_at: string;
    steps: {id: number; title: string; done_at: string | null; done_by: string | null; done_by_image?: string | null}[];
}

export const DOCUMENT_KINDS = [
    'V5C registration certificate (logbook)',
    'Insurance certificate',
    'MOT certificate',
    'Lease or finance agreement',
    'Other',
] as const;

export interface VehicleDocument {
    id: number;
    vehicle_id: number;
    kind: string;
    number: string;
    date: string;
    expires_on: string;
    note: string;
    file_name: string;
    file_url?: string;
    uploaded_by: string;
    uploaded_by_image?: string | null;
    uploaded_at: string;
}

export interface DriverLog {
    id: number;
    vehicle_id: number;
    driver_id: number;
    driver_name: string;
    driver_image?: string | null;
    from: string;
    to: string | null;
}

export const lowestTread = (e: VehicleEvent) => {
    const values = Object.values(e.tread ?? {}).filter((n): n is number => typeof n === 'number');
    if (values.length) return Math.min(...values);
    return typeof e.lowest_tread === 'number' ? e.lowest_tread : null;
};

/* ---------- Tyres ---------- */
export type TyreWheel = 'FL' | 'FR' | 'RL' | 'RR';
export const TYRE_WHEELS: [TyreWheel, string][] = [
    ['FL', 'Front left'],
    ['FR', 'Front right'],
    ['RL', 'Rear left'],
    ['RR', 'Rear right'],
];
export type TyreState = 'ok' | 'worn' | 'replace';
export const TYRE_STATE: Record<TyreState, {label: string; color: 'success' | 'warning' | 'error'}> = {
    ok: {label: 'OK', color: 'success'},
    worn: {label: 'Worn', color: 'warning'},
    replace: {label: 'Replace', color: 'error'},
};
// what the checker chose, or Replace when tread is at the limit
export const wheelState = (e: VehicleEvent, w: TyreWheel): TyreState => {
    const tread = e.tread?.[w];
    if (typeof tread === 'number' && tread <= FLEET_RULES.treadLimitMm) return 'replace';
    return e.wheels?.[w]?.state ?? 'ok';
};

export const money = (value?: number | null) =>
    value === null || value === undefined ? '-' : `£${Number(value).toFixed(2)}`;

export interface VehicleForm {
    id?: number;
    registration: string;
    make_model: string;
    type: VehicleType;
    fuel_type: FuelType;
    mileage: string;
    status: Exclude<VehicleStatus, 'archived'>;
    driver_id: number | null;
    mot_due: string;
    insurance_due: string;
    tax_due: string;
    service_due: string;
    gps_tracker: string;
    notes: string;
}

export const emptyVehicle: VehicleForm = {
    registration: '',
    make_model: '',
    type: 'company',
    fuel_type: 'diesel',
    mileage: '',
    status: 'active',
    driver_id: null,
    mot_due: '',
    insurance_due: '',
    tax_due: '',
    service_due: '',
    gps_tracker: '',
    notes: '',
};

export const VEHICLE_TYPES: {
    value: VehicleType;
    label: string;
    short: string;
    hint: string;
}[] = [
    {
        value: 'company',
        label: 'Company',
        short: 'Company',
        hint: 'Company van or car used for work.',
    },
    {
        value: 'management',
        label: 'Company · management',
        short: 'Management',
        hint: 'Company car a manager may also use privately.',
    },
    {
        value: 'private',
        label: 'Private · expenses allowed',
        short: 'Private car',
        hint: "Employee's own car. Only MOT and insurance are tracked; the driver claims business mileage.",
    },
];

export const FUEL_TYPES: {value: FuelType; label: string}[] = [
    {value: 'diesel', label: 'Diesel'},
    {value: 'petrol', label: 'Petrol'},
    {value: 'electric', label: 'Electric'},
    {value: 'hybrid', label: 'Hybrid'},
];

export const VEHICLE_STATUSES: {
    value: VehicleStatus;
    label: string;
    hint: string;
    color: 'success' | 'default' | 'warning' | 'secondary';
}[] = [
    {value: 'active', label: 'Active', hint: 'On the road and in use.', color: 'success'},
    {value: 'in_service', label: 'In service', hint: 'At the garage for repair or a service.', color: 'warning'},
    {value: 'inactive', label: 'Inactive', hint: 'Not in use for now, e.g. no driver.', color: 'default'},
    {value: 'archived', label: 'Archived', hint: 'Sold or removed. History is kept.', color: 'secondary'},
];

export type VehicleFormErrors = Partial<
    Record<'registration' | 'make_model' | 'mileage' | 'driver_id' | 'mot_due' | 'insurance_due' | 'tax_due', string>
>;

export const DUE_CHIP: Record<DueState, {label: string; color: 'success' | 'warning' | 'error' | 'default'}> = {
    ok: {label: 'OK', color: 'success'},
    soon: {label: 'Due soon', color: 'warning'},
    overdue: {label: 'Overdue', color: 'error'},
    missing: {label: 'Not set', color: 'default'},
};

export const typeLabel = (type: VehicleType) => VEHICLE_TYPES.find((t) => t.value === type)?.label ?? type;
export const fuelLabel = (fuel: FuelType) => FUEL_TYPES.find((f) => f.value === fuel)?.label ?? fuel;
export const statusInfo = (status: VehicleStatus) =>
    VEHICLE_STATUSES.find((s) => s.value === status) ?? VEHICLE_STATUSES[0];

export const dueState = (date?: string | null): DueState => {
    if (!date) return 'missing';
    const days = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (days < 0) return 'overdue';
    if (days <= FLEET_RULES.dueSoonDays) return 'soon';
    return 'ok';
};

export interface DueItem {
    label: string;
    date: string;
    state: DueState;
}

// Dates that apply to the vehicle: private cars only need MOT and insurance.
export const dueItems = (v: Vehicle): DueItem[] => {
    const items: {label: string; date: string}[] = [
        {label: 'MOT', date: v.mot_due},
        {label: 'Insurance', date: v.insurance_due},
    ];
    if (v.type !== 'private') {
        items.push(
            {label: 'Road tax', date: v.tax_due},
            {label: 'Service', date: v.service_due},
            {label: 'Tyre check', date: v.tyre_check_due ?? ''},
            {label: 'Photo check', date: v.next_photo_check ?? ''},
        );
    }
    return items.map((i) => ({...i, state: dueState(i.date)}));
};

const DUE_ORDER: Record<DueState, number> = {overdue: 0, soon: 1, missing: 2, ok: 3};

// The item that needs attention first: overdue, then due soon, then the earliest date.
export const nextDue = (v: Vehicle): DueItem | null => {
    const items = dueItems(v);
    if (!items.length) return null;
    return [...items].sort((a, b) => {
        const byState = DUE_ORDER[a.state] - DUE_ORDER[b.state];
        if (byState !== 0) return byState;
        return (a.date || '9999').localeCompare(b.date || '9999');
    })[0];
};

export const formatDate = (date?: string | null) => (date ? dayjs(date).format('DD/MM/YYYY') : '-');

// Every image on a record: tyre photos, the extra photo, other photos and an attached invoice photo.
export const eventImages = (e: VehicleEvent): string[] => {
    const isImage = (name?: string) => !!name && /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(name);

    return [
        ...Object.values(e.wheels ?? {}).flatMap((w) => (w?.photo ? [w.photo] : [])),
        ...(e.extra_photo ? [e.extra_photo] : []),
        ...(e.photos ?? []),
        ...(e.file_url && (isImage(e.file_name) || isImage(e.file_url)) ? [e.file_url] : []),
    ];
};

export const formatMiles = (miles?: number | null) =>
    miles === null || miles === undefined ? '-' : `${Number(miles).toLocaleString('en-GB')} mi`;

// UK registrations are stored in capitals with a single space, e.g. "BD23 MNG".
export const normaliseRegistration = (value: string) =>
    value
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trimStart();
