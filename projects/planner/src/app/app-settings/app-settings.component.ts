import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
    NonNullableFormBuilder, FormGroup, Validators, FormControl
} from '@angular/forms';
import { Location } from '@angular/common';
import { faFlag } from '@fortawesome/free-regular-svg-icons';
import { faUserCog } from '@fortawesome/free-solid-svg-icons';
import { SettingsNormalizationService } from '../shared/settings-normalization.service';
import { RangeConstants, UnitConversion } from '../shared/UnitConversion';
import { SubViewStorage } from '../shared/subViewStorage';
import { ApplicationSettingsService } from '../shared/ApplicationSettings';
import { InputControls } from '../shared/inputcontrols';
import { ValidatorGroups } from '../shared/ValidatorGroups';
import { Precision, GasDensity } from 'scuba-physics';

@Component({
    selector: 'app-app-settings',
    templateUrl: './app-settings.component.html',
    styleUrls: ['./app-settings.component.scss']
})
export class AppSettingsComponent implements OnInit {
    public flagIcon = faFlag;
    public diverIcon = faUserCog;

    public settingsForm!: FormGroup<{
        imperialUnits: FormControl<boolean>;
        maxDensity: FormControl<number>;
    }>;

    constructor(
        public units: UnitConversion,
        private settingsNormalization: SettingsNormalizationService,
        private views: SubViewStorage,
        public appSettings: ApplicationSettingsService,
        private formBuilder: NonNullableFormBuilder,
        private cd: ChangeDetectorRef,
        private inputs: InputControls,
        private validators: ValidatorGroups,
        public location: Location) {
    }

    public get ranges(): RangeConstants {
        return this.units.ranges;
    }

    public get maxDensityInvalid(): boolean {
        const densityControl = this.settingsForm.controls.maxDensity;
        return this.inputs.controlInValid(densityControl);
    }

    public get densityStep(): number {
        return Math.pow(0.1, this.ranges.densityRounding);
    }

    private get maxDensity(): number {
        return Precision.round(this.appSettings.maxGasDensity, this.ranges.densityRounding);
    }

    public ngOnInit(): void {
        this.settingsForm = this.formBuilder.group({
            imperialUnits: [this.units.imperialUnits, [Validators.required]],
            maxDensity: [this.maxDensity, this.validators.maxDensity]
        });
    }

    public use(): void {
        if (this.settingsForm.invalid) {
            return;
        }

        const newValues = this.settingsForm.controls;
        this.appSettings.maxGasDensity = Number(newValues.maxDensity.value);
        // apply imperial last, to be able to apply in current units
        this.units.imperialUnits = Boolean(newValues.imperialUnits.value);

        this.settingsNormalization.apply();
        this.views.reset();
        this.reLoad();

        // only to recheck the form validity
        this.cd.detectChanges();
    }

    public resetToDefault(): void {
        this.settingsForm.patchValue({
            imperialUnits: false,
            maxDensity: Precision.round(this.appSettings.defaultMaxGasDensity, this.ranges.densityRounding)
        });

        // don't apply yet, let the user confirm
    }

    private reLoad(): void {
        this.settingsForm.patchValue({
            maxDensity: this.maxDensity
        });
    }
}
