import { EventEmitter, Injectable, Input, Output } from '@angular/core';
import { WayPoint } from './models';
import { DiveSchedules } from './dive.schedules';
import { DateFormats } from './formaters';

@Injectable()
export class SelectedWaypoint {
    @Output() public selectedChanged = new EventEmitter<WayPoint>();
    private lastSelected: WayPoint | undefined;

    constructor(private schedules: DiveSchedules) {}

    @Input()
    public set selectedTimeStamp(newValue: string) {
        let found: WayPoint | undefined;
        if (newValue) {
            const newTimeStamp = DateFormats.secondsFromDate(newValue);
            const dive = this.schedules.selected.diveResult;
            found = dive.wayPoints.find(p => p.fits(newTimeStamp));
        }

        this.selected = found;
    }

    @Input()
    public set selected(point: WayPoint | undefined) {
        if (this.lastSelected) {
            this.lastSelected.selected = false;
        }

        this.lastSelected = point;

        if (point) {
            if (this.lastSelected) {
                this.lastSelected.selected = true;
            }
        }

        this.selectedChanged.emit(this.lastSelected);
    }
}
