import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GasPropertiesCalcComponent } from './gas.props.component';
import { UnitConversion } from '../shared/UnitConversion';
import { ValidatorGroups } from '../shared/ValidatorGroups';
import { InputControls } from '../shared/inputcontrols';
import { DecimalPipe } from '@angular/common';
import { SubViewStorage } from '../shared/subViewStorage';
import { ViewStates } from '../shared/viewStates';
import { PreferencesStore } from '../shared/preferencesStore';
import { PlannerService } from '../shared/planner.service';
import { WorkersFactoryCommon } from '../shared/serial.workers.factory';
import { TanksService } from '../shared/tanks.service';
import { Plan } from '../shared/plan.service';
import { OptionsService } from '../shared/options.service';
import { WayPointsService } from '../shared/waypoints.service';
import { Preferences } from '../shared/preferences';
import { ViewSwitchService } from '../shared/viewSwitchService';

describe('WeightCalcComponent', () => {
    let component: GasPropertiesCalcComponent;
    let fixture: ComponentFixture<GasPropertiesCalcComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [GasPropertiesCalcComponent],
            providers: [
                UnitConversion, ValidatorGroups, InputControls,
                DecimalPipe, SubViewStorage, ViewStates,
                PreferencesStore, PlannerService, WorkersFactoryCommon,
                TanksService, Plan, OptionsService, WayPointsService,
                Preferences, ViewSwitchService
            ]
        });
        fixture = TestBed.createComponent(GasPropertiesCalcComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('Calculates theoretical depth', () => {
        component.tank.tank.consumed = 150;
        expect(component.weight).toBeCloseTo(2.8, 3);
    });
});
