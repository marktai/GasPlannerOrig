import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { PlannerService } from '../shared/planner.service';
import { Diver } from '../shared/models';

@Component({
  selector: 'app-diver',
  templateUrl: './diver.component.html',
  styleUrls: ['./diver.component.css']
})
export class DiverComponent implements OnInit {
  public diver: Diver;
  public user = faUser;
  constructor(private planer: PlannerService, private location: Location) { }

  public goBack(): void {
    this.location.back();
  }

  ngOnInit() {
    this.diver = this.planer.diver;
  }
}
