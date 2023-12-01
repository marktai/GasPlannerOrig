import { Observable, Subject } from 'rxjs';
import { Tank} from 'scuba-physics';
import { Injectable } from '@angular/core';
import { DiveSchedule } from './dive.schedules';

/**
 * Since we show only the selected dive schedule,
 * we are always reloading properties of selected dive to the UI.
 */
@Injectable()
export class ReloadDispatcher {
    /**
     *  Event fired only in case of tanks rebuild (loadFrom or resetToSimple).
     *  Not fired when adding or removing tanks.
     **/
    public tanksReloaded$: Observable<void>;
    public tankChanged$: Observable<void>;
    public tankRemoved$: Observable<Tank>;
    /** Event fired only in case of segments rebuild. Not fired when adding or removing. */
    public depthsReloaded$: Observable<void>;
    public depthChanged$: Observable<void>;
    public optionsReloaded$: Observable<void>;
    public optionsChanged$: Observable<void>;
    public selectedChanged$: Observable<void>;
    private onTanksReloaded = new Subject<void>();
    private onTankChanged = new Subject<void>();
    private onTankRemoved = new Subject<Tank>();
    private onDepthsReloaded = new Subject<void>();
    private onDepthChanged = new Subject<void>();
    private onOptionsReloaded = new Subject<void>();
    private onOptionsChanged = new Subject<void>();
    private onSelectedChanged = new Subject<void>();

    /**
    * to prevent circular dependency on DiveSchedules,
    * we remember it when its value is changing.
    * Used to prevent firing events in case updating not selected dive
    */
    private lastSelected?: DiveSchedule;

    constructor() {
        this.tanksReloaded$ = this.onTanksReloaded.asObservable();
        this.tankRemoved$ = this.onTankRemoved.asObservable();
        this.tankChanged$ = this.onTankChanged.asObservable();
        this.depthsReloaded$ = this.onDepthsReloaded.asObservable();
        this.depthChanged$ = this.onDepthChanged.asObservable();
        this.optionsReloaded$ = this.onOptionsReloaded.asObservable();
        this.optionsChanged$ = this.onOptionsChanged.asObservable();
        this.selectedChanged$ = this.onSelectedChanged.asObservable();
    }

    public sendTanksReloaded(): void {
        console.log('Tanks reloaded');
        this.onTanksReloaded.next();
    }

    public sendTanksRemoved(removed: Tank): void {
        console.log('Tank removed');
        this.onTankRemoved.next(removed);
    }

    public sendTankChanged(){
        console.log('Tank changed');
        this.onTankChanged.next();
    }

    public sendDepthsReloaded(): void {
        console.log('Depths reloaded');
        this.onDepthsReloaded.next();
    }

    public sendDepthChanged(): void {
        console.log('Depth changed');
        this.onDepthChanged.next();
    }

    public sendOptionsReloaded(): void {
        console.log('Options reloaded');
        this.onOptionsReloaded.next();
    }

    public sendOptionsChanged(): void {
        console.log('Options changed');
        this.onOptionsChanged.next();
    }

    // TODO use lastSelected to check when firing events
    // TODO when reloading all profiles we need to kick of recalculation from first dive
    // so first we need to select first dive and then reload
    // TODO register to all events changing data in Delayed schedule
    // TODO we dont need to calculate on tank remove, because it kicks of depths reload
    public sendSelectedChanged(newSelected: DiveSchedule): void {
        this.lastSelected = newSelected;
        this.onSelectedChanged.next();
    }
}
