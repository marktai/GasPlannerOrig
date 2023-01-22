import { Observable, Subject } from 'rxjs';
import { Ceiling, Time, Event, Segment, Segments, SegmentsFactory,
    StandardGases, Options, Tank, OtuCalculator, Precision } from 'scuba-physics';
import { UnitConversion } from './UnitConversion';

export enum Strategies {
    ALL = 1,
    HALF = 2,
    THIRD = 3
}

export class Level {
    constructor(
        private units: UnitConversion,
        public segment: Segment
    ){
    }

    public get duration(): number {
        return Time.toMinutes(this.segment.duration);
    }

    public get startDepth(): number {
        const depth = this.segment.startDepth;
        return this.units.fromMeters(depth);
    }

    public get endDepth(): number {
        const depth = this.segment.endDepth;
        return this.units.fromMeters(depth);
    }

    public get tank(): Tank | undefined {
        return this.segment.tank;
    }

    public get tankLabel(): string {
        const tank = this.segment.tank;
        return Level.tankLabel(this.units, tank);
    }

    /** in minutes */
    public set duration(newValue: number) {
        this.segment.duration = Time.toSeconds(newValue);
    }

    public set endDepth(newValue: number) {
        const meters = this.units.toMeters(newValue);
        this.segment.endDepth = meters;
    }

    public set tank(newValue: Tank | undefined) {
        this.segment.tank = newValue;
    }

    public static tankLabel(units: UnitConversion, tank: Tank | undefined): string {
        if(!tank) {
            return '';
        }

        const volume = units.fromTankLiters(tank.size);
        const startPressure = units.fromBar(tank.startPressure);
        return `${tank.id}. ${tank.name}/${volume}/${startPressure}`;
    }
}

export class Plan {
    private static readonly defaultDuration = Time.oneMinute * 10;
    public noDecoTime = 0;
    /** Event fired only in case of segments rebuild. Not fired when adding or removing. */
    public reloaded$: Observable<void>;
    private _segments: Segments = new Segments();
    private onReloaded = new Subject<void>();

    /** provide the not necessary tank and options only to start from simple valid profile */
    constructor(public strategy: Strategies, depth: number, duration: number, tank: Tank, options: Options) {
        this.reloaded$ = this.onReloaded.asObservable();
        this.reset(depth, duration, tank, options);
    }

    public get length(): number {
        return this._segments.length;
    }

    public get minimumSegments(): boolean {
        return this.length > 1;
    }

    public get notEnoughTime(): boolean {
        return this.length === 2 && this.segments[1].duration === 0;
    }

    public get segments(): Segment[] {
        return this._segments.items;
    }

    public get maxDepth(): number {
        return this._segments.maxDepth;
    }

    public get startAscentIndex(): number {
        return this._segments.startAscentIndex;
    }

    public get startAscentTime(): number {
        return this._segments.startAscentTime;
    }

    /** in minutes */
    public get duration(): number {
        const seconds = this._segments.duration;
        return Time.toMinutes(seconds);
    }

    public get availablePressureRatio(): number {
        return this.strategy === Strategies.THIRD ? 2 / 3 : 1;
    }

    public get needsReturn(): boolean {
        return this.strategy !== Strategies.ALL;
    }

    public get noDecoExceeded(): boolean {
        return this.duration > this.noDecoTime;
    }

    public copySegments(): Segments {
        return this._segments.copy();
    }

    public setSimple(depth: number, duration: number, tank: Tank, options: Options): void {
        this.reset(depth, duration, tank, options);
        this.onReloaded.next();
    }


    public assignDepth(newDepth: number, tank: Tank, options: Options): void {
        this._segments = SegmentsFactory.createForPlan(newDepth, this.duration, tank, options);
        this.onReloaded.next();
    }

    public assignDuration(newDuration: number, tank: Tank, options: Options): void {
        this._segments = SegmentsFactory.createForPlan(this.maxDepth, newDuration, tank, options);
        this.onReloaded.next();
    }

    public addSegment(tank: Tank): void {
        const last = this._segments.last();
        const created = this._segments.addChangeTo(last.endDepth, tank.gas, Plan.defaultDuration);
        created.tank = tank;
    }

    public removeSegment(segment: Segment): void {
        this._segments.remove(segment);
    }

    public fixDepths(): void {
        this._segments.fixStartDepths();
    }

    public loadFrom(other: Segment[]): void {
        // TODO restore Strategy
        // this.strategy = other.strategy;
        // cant use copy, since deserialized objects wouldn't have one.
        this._segments = Segments.fromCollection(other);
        this.onReloaded.next();
    }

    public resetSegments(removed: Tank, replacement: Tank): void {
        this.segments.forEach(segment => {
            if (segment.tank === removed) {
                segment.tank = replacement;
            }
        });
        this.onReloaded.next();
    }

    private reset(depth: number, duration: number, tank: Tank, options: Options): void {
        this._segments = SegmentsFactory.createForPlan(depth, duration, tank, options);
    }
}

export class Dive {
    public calculated = false;
    public diveInfoCalculated = false;
    public profileCalculated = false;
    public calculationFailed = false;
    public maxTime = 0;
    public timeToSurface = 0;
    public turnPressure = 0;
    public turnTime = 0;
    public needsReturn = false;
    public notEnoughGas = false;
    public notEnoughTime = false;
    public noDecoExceeded = false;
    public emergencyAscentStart = 0;
    public averageDepth = 0;
    // TODO add event in case otu and CNS reached 80% of single exposure limits
    public otu = 0;
    public cns = 0;
    public wayPoints: WayPoint[] = [];
    public ceilings: Ceiling[] = [];
    public events: Event[] = [];

    /** can't use plan duration, because it doesn't contain ascent */
    public get totalDuration(): number {
        if (this.wayPoints.length === 0) {
            return 0;
        }

        return this.wayPoints[this.wayPoints.length - 1].endTime;
    }

    /** the only errors preventing draw chart */
    public get hasErrors(): boolean {
        return this.calculated && (this.calculationFailed || this.notEnoughTime);
    }

    public get showResults(): boolean {
        return this.calculated && !this.hasErrors;
    }

    public get otuExceeded(): boolean {
        return this.otu > (.8 * OtuCalculator.dailyLimit);
    }

    public get cnsExeeded(): boolean {
        return this.cns > 0.8;
    }

    public get showMaxDuration(): boolean {
        return this.calculated && this.maxTime > 0;
    }

    public emptyProfile(): void {
        this.wayPoints = [];
        this.ceilings = [];
        this.events = [];
    }
}

export enum SwimAction {
    hover = 0,
    ascent = 1,
    descent = 2,
    switch = 3
}

export class WayPoint {
    public selected = false;

    /** in seconds */
    public startTime = 0;
    /** in seconds */
    public endTime = 0;
    /** in meters */
    private _startDepth = 0;
    /** in meters */
    private _endDepth = 0;
    /** meters per sec */
    private speed = 0;

    private action: SwimAction = SwimAction.hover;

    private _gasName = '';

    /**
     * @param duration in seconds
     * @param newDepth in meters
     * @param previousDepth in meters
     */
    private constructor(public duration: number, newDepth: number, previousDepth: number = 0) {
        this.endTime = Precision.roundTwoDecimals(duration);
        this._endDepth = newDepth;
        this._startDepth = previousDepth;
        this.updateSwimAction();
    }

    public get gasName(): string {
        return this._gasName;
    }

    /** in meters */
    public get startDepth(): number {
        return this._startDepth;
    }

    /** in meters */
    public get endDepth(): number {
        return this._endDepth;
    }

    /** in meters */
    public get averageDepth(): number {
        return (this.startDepth + this.endDepth) / 2;
    }

    public get swimAction(): SwimAction {
        return this.action;
    }

    public get label(): string {
        if (this.startDepth !== this.endDepth) {
            return '';
        }

        const depth = `${this.endDepth} m`;
        let durationText = Precision.round(this.duration).toString();
        durationText += ' min.';
        return `${depth},${durationText}`;
    }

    public static fromSegment(segment: Segment): WayPoint {
        const newWayPoint = new WayPoint(segment.duration, segment.endDepth);
        const gasName = StandardGases.nameFor(segment.gas.fO2, segment.gas.fHe);
        newWayPoint._gasName = gasName;
        newWayPoint.speed = segment.speed;
        return newWayPoint;
    }

    public asGasSwitch(): void {
        this.action = SwimAction.switch;
    }

    public toLevel(segment: Segment): WayPoint {
        const result = WayPoint.fromSegment(segment);
        result.startTime = this.endTime;
        const end = this.endTime + segment.duration;
        result.endTime = Precision.roundTwoDecimals(end);
        result._startDepth = this.endDepth;
        result.updateSwimAction();
        return result;
    }

    public fits(timeStamp: number): boolean {
        return this.startTime <= timeStamp && timeStamp < this.endTime;
    }

    public depthAt(duration: number): number {
        return Segment.depthAt(this.startDepth, this.speed, duration);
    }

    private updateSwimAction(): void {
        this.action = SwimAction.hover;

        if (this.startDepth < this.endDepth) {
            this.action = SwimAction.descent;
        }

        if (this.startDepth > this.endDepth) {
            this.action = SwimAction.ascent;
        }
    }
}
