<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids, SoftDeletes;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'email',
        'password',
        'first_name',
        'last_name',
        'phone',
        'role',
        'is_active',
        'balance',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function getFirstNameAttribute($value)
    {
        return $value;
    }

    public function setFirstNameAttribute($value)
    {
        $this->attributes['first_name'] = $value;
    }

    public function getLastNameAttribute($value)
    {
        return $value;
    }

    public function setLastNameAttribute($value)
    {
        $this->attributes['last_name'] = $value;
    }

    public function getIsActiveAttribute($value)
    {
        return (bool) $value;
    }

    public function setIsActiveAttribute($value)
    {
        $this->attributes['is_active'] = $value;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'user_id');
    }
}
