import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Patient } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  // TODO: The user must provide the Web App URL after deploying the GAS script
  private apiUrl = 'https://script.google.com/macros/s/AKfycbzpHN0xjlz7AMQ95DGq6qbPb1FnB5TPd15HxywneNRX2GckYnmkVEdfOUPk47B9oGWq/exec';

  constructor(private http: HttpClient) { }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  addPatientEntry(patient: Partial<Patient>): Observable<any> {
    return this.http.post(this.apiUrl, JSON.stringify(patient));
  }
}
