import { Component } from '@angular/core';
import { faBatteryHalf, faTrashAlt, faPlusSquare } from '@fortawesome/free-solid-svg-icons';

import { PlannerService } from '../shared/planner.service';
import { StandardGases, Tank, Diver } from 'scuba-physics';
import { RangeConstants, UnitConversion } from '../shared/UnitConversion';

export class TankBound {
    constructor(public tank: Tank, private units: UnitConversion) {}

    public get size(): number {
        // TODO fix cubic feet conversion by including working pressure
        // S80 => 11.1 L  => 0.392 cuft  * 207 bar = 80.7 cuft
        return this.units.fromLiter(this.tank.size);
    }

    public get startPressure(): number {
        return this.units.fromBar(this.tank.startPressure);
    }

    public get o2(): number {
        return this.tank.o2;
    }

    public set size(newValue: number) {
        this.tank.size = this.units.toLiter(newValue);
    }

    public set startPressure(newValue: number) {
        this.tank.startPressure = this.units.toBar(newValue);
    }

    public set o2(newValue: number) {
        this.tank.o2 = newValue;
    }
}

@Component({
    selector: 'app-tanks',
    templateUrl: './tanks.component.html',
    styleUrls: ['./tanks.component.css']
})
export class TanksComponent {
    public firstTank: TankBound;
    public allNames: string[];
    public nitroxNames: string[];
    public icon = faBatteryHalf;
    public plusIcon = faPlusSquare;
    public trashIcon = faTrashAlt;
    private diver: Diver;

    constructor(public planner: PlannerService, public units: UnitConversion) {
        this.firstTank = new TankBound(this.planner.firstTank, this.units);
        this.diver = this.planner.diver;
        this.allNames = StandardGases.allNames();
        this.nitroxNames = StandardGases.nitroxNames();
    }

    public get ranges(): RangeConstants {
        return this.units.ranges;
    }

    public get tanks(): Tank[] {
        return this.planner.tanks;
    }

    public get isComplex(): boolean {
        return this.planner.isComplex;
    }

    public gasSac(tank: Tank): number {
        const sac = this.diver.gasSac(tank);
        return this.units.toLiter(sac);
    }

    public addTank(): void {
        this.planner.addTank();
    }

    public removeTank(tank: Tank): void {
        this.planner.removeTank(tank);
    }

    public assignBestMix(): void {
        this.firstTank.o2 = this.planner.bestNitroxMix();
    }

    public gasChanged(): void {
        this.planner.calculate();
    }

    public assignStandardGas(gas: Tank, gasName: string): void {
        gas.assignStandardGas(gasName);
        this.gasChanged();
    }
}
