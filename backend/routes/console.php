<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('bookings:expire-pending')->everyMinute();
Schedule::command('bookings:mark-no-show')->hourly();
