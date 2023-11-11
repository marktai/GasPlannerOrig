import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileChartComponent } from './profilechart.component';
import { DiveResults } from '../shared/diveresults';
import { PlannerService } from '../shared/planner.service';
import { WorkersFactoryCommon } from '../shared/serial.workers.factory';
import { TanksService } from '../shared/tanks.service';
import { UnitConversion } from '../shared/UnitConversion';
import { OptionsService } from '../shared/options.service';
import { WayPointsService } from '../shared/waypoints.service';
import { SelectedWaypoint } from '../shared/selectedwaypointService';
import {DiveSchedules} from '../shared/dive.schedules';
import {DepthsService} from '../shared/depths.service';
import {ReloadDispatcher} from '../shared/reloadDispatcher';

describe('ProfileChartComponent', () => {
    let component: ProfileChartComponent;
    let fixture: ComponentFixture<ProfileChartComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ProfileChartComponent],
            providers: [
                PlannerService, WorkersFactoryCommon, TanksService,
                OptionsService, WayPointsService, SelectedWaypoint,
                UnitConversion, DiveResults, DiveSchedules,
                DepthsService, ReloadDispatcher
            ]
        });

        fixture = TestBed.createComponent(ProfileChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
