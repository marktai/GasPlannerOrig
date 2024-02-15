import {Injectable} from '@angular/core';
import {DiveSchedule, DiveSchedules} from './dive.schedules';
import {DiveResults} from './diveresults';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable()
export class ProfileComparatorService {

    private _profileAIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private _profileBIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    constructor(private schedules: DiveSchedules) {
    }

    get totalDuration(): number {
        if(this.profileAResults.totalDuration > this.profileBResults.totalDuration){
            return this.profileAResults.totalDuration;
        }
        return this.profileBResults.totalDuration;
    }

    public get profileAIndex(): Observable<number> {
        return this._profileAIndex.asObservable();
    }

    public get profileBIndex(): Observable<number> {
        return this._profileBIndex.asObservable();
    }

    public get profileA(): DiveSchedule {
        return this.schedules.dives[this._profileAIndex.getValue()];
    }

    public get profileB(): DiveSchedule {
        return this.schedules.dives[this._profileBIndex.getValue()];
    }

    public get profileAResults(): DiveResults {
        return this.profileA.diveResult;
    }

    public get profileBResults(): DiveResults {
        return this.profileB.diveResult;
    }

    private set profileAIndex(value: number) {
        this._profileAIndex.next(value);
    }

    private set profileBIndex(value: number) {
        this._profileBIndex.next(value);
    }

    public hasTwoProfiles(): boolean {
        return this.schedules.length > 1;
    }

    public areResultsCalculated(): boolean {
        return this.profileAResults.calculated && this.profileBResults.calculated;
    }

    public areDiveInfosCalculated(): boolean {
        return this.profileAResults.diveInfoCalculated && this.profileBResults.diveInfoCalculated;
    }

    public areProfilesCalculated(): boolean {
        return this.profileAResults.profileCalculated && this.profileBResults.profileCalculated;
    }
}
