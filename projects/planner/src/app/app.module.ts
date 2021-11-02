import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CustomFormsModule } from './validators/custom-forms.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AppComponent } from './app.component';
import { TanksComponent } from './tanks/tanks.component';
import { DiverComponent } from './diver/diver.component';
import { DiveOptionsComponent } from './diveoptions/diveoptions.component';
import { DiveInfoComponent } from './diveinfo/diveinfo.component';
import { PlannerService } from './shared/planner.service';
import { PreferencesService } from './shared/preferences.service';
import { MainMenuComponent } from './mainmenu/mainmenu.component';
import { AppRoutingModule } from './app-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GaslabelComponent } from './gaslabel/gaslabel.component';
import { SacComponent } from './sac/sac.component';
import { NitroxComponent } from './nitrox/nitrox.component';
import { WayPointsComponent } from './waypoints/waypoints.component';
import { ProfileChartComponent } from './profilechart/profilechart.component';
import { AboutComponent } from './about/about.component';
import { AppFooterComponent } from './footer/footer.component';
import { DepthsComponent } from './depths/depths.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { TankChartComponent } from './tank-chart/tank-chart.component';

@NgModule({
    declarations: [
        AppComponent,
        TanksComponent,
        DiverComponent,
        DiveOptionsComponent,
        DiveInfoComponent,
        SacComponent,
        MainMenuComponent,
        DashboardComponent,
        GaslabelComponent,
        NitroxComponent,
        WayPointsComponent,
        ProfileChartComponent,
        AboutComponent,
        AppFooterComponent,
        DepthsComponent,
        TankChartComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        AppRoutingModule,
        CustomFormsModule,
        FontAwesomeModule,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
    ],
    exports: [],
    providers: [PlannerService, PreferencesService],
    bootstrap: [AppComponent]
})
export class AppModule { }
